package com.mediportal.controller;

import com.mediportal.dto.*;
import com.mediportal.model.Doctor;
import com.mediportal.model.Patient;
import com.mediportal.repository.DoctorRepository;
import com.mediportal.repository.PatientRepository;
import com.mediportal.security.JwtUtils;
import com.mediportal.service.EmailService;
import com.mediportal.service.RedisService;
import com.mediportal.service.SmsService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired PatientRepository patientRepository;
    @Autowired DoctorRepository doctorRepository;
    @Autowired JwtUtils jwtUtils;
    @Autowired RedisService redisService;
    @Autowired SmsService smsService;
    @Autowired EmailService emailService;
    @Autowired PasswordEncoder passwordEncoder;

    // ─────────────────────────────────────────────────────────────
    // Helpers: resolve identifier (phone or email) → user
    // ─────────────────────────────────────────────────────────────

    private boolean isPhone(String id) {
        return id != null && id.matches("^[+\\d].*");
    }

    private Optional<Patient> findPatient(String id) {
        return isPhone(id) ? patientRepository.findByPhone(id) : patientRepository.findByEmail(id);
    }

    private Optional<Doctor> findDoctor(String id) {
        return isPhone(id) ? doctorRepository.findByPhone(id) : doctorRepository.findByEmail(id);
    }

    private boolean existsAny(String id) {
        if (isPhone(id)) {
            return patientRepository.existsByPhone(id) || doctorRepository.existsByPhone(id);
        }
        return patientRepository.existsByEmail(id) || doctorRepository.existsByEmail(id);
    }

    /** Resolve email identifier → phone (SMS always goes to phone). */
    private String resolvePhone(String id) {
        if (isPhone(id)) return id;
        Optional<Patient> p = patientRepository.findByEmail(id);
        if (p.isPresent()) return p.get().getPhone();
        Optional<Doctor> d = doctorRepository.findByEmail(id);
        return d.map(Doctor::getPhone).orElse(null);
    }

    private JwtResponse buildJwt(Patient p) {
        return new JwtResponse(jwtUtils.generateTokenFromPhone(p.getPhone(), "ROLE_PATIENT"),
                p.getId(), p.getFirstName(), p.getLastName(), p.getPhone(), "PATIENT");
    }

    private JwtResponse buildJwt(Doctor d) {
        return new JwtResponse(jwtUtils.generateTokenFromPhone(d.getPhone(), "ROLE_DOCTOR"),
                d.getId(), d.getFirstName(), d.getLastName(), d.getPhone(), "DOCTOR");
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Generate OTP  (LOGIN | REGISTER | FORGOT_PASSWORD)
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/generate-otp")
    public ResponseEntity<?> generateOtp(@RequestBody GenerateOtpRequest request) {
        String id = request.resolvedIdentifier();
        if (id == null || id.isBlank())
            return ResponseEntity.badRequest().body(new MessageResponse("Phone or email is required."));

        String type = request.getType() == null ? "LOGIN" : request.getType().toUpperCase();

        switch (type) {
            case "LOGIN" -> {
                if (!existsAny(id))
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(new MessageResponse("Account not found. Please register first."));
            }
            case "REGISTER" -> {
                if (existsAny(id))
                    return ResponseEntity.badRequest()
                            .body(new MessageResponse("Already registered. Please sign in."));
            }
            case "FORGOT_PASSWORD" -> {
                if (!existsAny(id))
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(new MessageResponse("Account not found."));
            }
        }

        if (redisService.isRateLimited(id))
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new MessageResponse("Too many requests. Please try again later."));

        redisService.recordAttempt(id);
        String otp = smsService.generateOtp();
        redisService.saveOtp(id, otp); // keyed by original identifier (phone or email)

        try {
            if (isPhone(id)) {
                // ── Phone identifier ── send OTP via SMS ──────────────────────
                smsService.sendOtp(id, otp);
                return ResponseEntity.ok(new MessageResponse("OTP sent to your mobile number."));
            } else {
                // ── Email identifier ── send OTP directly to inbox ────────────
                emailService.sendOtp(id, otp);
                return ResponseEntity.ok(new MessageResponse("OTP sent to your email address."));
            }
        } catch (Exception ex) {
            redisService.clearOtp(id);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new MessageResponse("Unable to send OTP right now. Please try again later."));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. OTP Login
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> loginWithOtp(@RequestBody LoginRequest request) {
        String id = request.resolvedIdentifier();
        if (id == null || id.isBlank())
            return ResponseEntity.badRequest().body(new MessageResponse("Phone or email is required."));

        String savedOtp = redisService.getOtp(id);
        if (savedOtp == null || !savedOtp.equals(request.getOtp()))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Invalid or expired OTP."));

        redisService.clearOtp(id);
        redisService.clearAttempts(id);

        Optional<Patient> patient = findPatient(id);
        if (patient.isPresent()) return ResponseEntity.ok(buildJwt(patient.get()));

        Optional<Doctor> doctor = findDoctor(id);
        if (doctor.isPresent()) return ResponseEntity.ok(buildJwt(doctor.get()));

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new MessageResponse("Account not found."));
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Password Login (NEW)
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/login/password")
    public ResponseEntity<?> loginWithPassword(@Valid @RequestBody PasswordLoginRequest request) {
        String id = request.getIdentifier();

        Optional<Patient> patient = findPatient(id);
        if (patient.isPresent()) {
            Patient p = patient.get();
            if (p.getPassword() == null || !passwordEncoder.matches(request.getPassword(), p.getPassword()))
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("Invalid credentials."));
            return ResponseEntity.ok(buildJwt(p));
        }

        Optional<Doctor> doctor = findDoctor(id);
        if (doctor.isPresent()) {
            Doctor d = doctor.get();
            if (d.getPassword() == null || !passwordEncoder.matches(request.getPassword(), d.getPassword()))
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("Invalid credentials."));
            return ResponseEntity.ok(buildJwt(d));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new MessageResponse("Account not found."));
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Reset Password — verify OTP and save new password (NEW)
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        String id = request.getIdentifier();
        String savedOtp = redisService.getOtp(id);

        if (savedOtp == null || !savedOtp.equals(request.getOtp()))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Invalid or expired OTP."));

        String hashed = passwordEncoder.encode(request.getNewPassword());

        Optional<Patient> patient = findPatient(id);
        if (patient.isPresent()) {
            Patient p = patient.get();
            p.setPassword(hashed);
            patientRepository.save(p);
            redisService.clearOtp(id);
            redisService.clearAttempts(id);
            return ResponseEntity.ok(new MessageResponse("Password updated successfully."));
        }

        Optional<Doctor> doctor = findDoctor(id);
        if (doctor.isPresent()) {
            Doctor d = doctor.get();
            d.setPassword(hashed);
            doctorRepository.save(d);
            redisService.clearOtp(id);
            redisService.clearAttempts(id);
            return ResponseEntity.ok(new MessageResponse("Password updated successfully."));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MessageResponse("Account not found."));
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Register Patient (password-based, no OTP)
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        // Duplicate checks
        if (patientRepository.existsByPhone(registerRequest.getPhone()) ||
                doctorRepository.existsByPhone(registerRequest.getPhone()))
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Mobile number is already registered."));

        if (patientRepository.existsByEmail(registerRequest.getEmail()) ||
                doctorRepository.existsByEmail(registerRequest.getEmail()))
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Email address is already registered."));

        Patient patient = new Patient();
        patient.setFirstName(registerRequest.getFirstName());
        patient.setLastName(registerRequest.getLastName());
        patient.setEmail(registerRequest.getEmail());
        patient.setPhone(registerRequest.getPhone());
        patient.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        patient.setDateOfBirth(registerRequest.getDateOfBirth());
        patient.setGender(registerRequest.getGender());
        patient.setBloodGroup(registerRequest.getBloodGroup());
        patient.setWeight(registerRequest.getWeight());
        patient.setHeight(registerRequest.getHeight());
        patient.setAge(registerRequest.getAge());

        Patient saved = patientRepository.save(patient);
        return ResponseEntity.ok(buildJwt(saved));
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Register Doctor (password-based, no OTP)
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/register/doctor")
    public ResponseEntity<?> registerDoctor(@Valid @RequestBody DoctorRegisterRequest req) {
        // Duplicate checks
        if (doctorRepository.existsByPhone(req.getPhone()) ||
                patientRepository.existsByPhone(req.getPhone()))
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Mobile number is already registered."));

        if (doctorRepository.existsByEmail(req.getEmail()) ||
                patientRepository.existsByEmail(req.getEmail()))
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Email address is already registered."));

        Doctor doctor = new Doctor();
        doctor.setFirstName(req.getFirstName());
        doctor.setLastName(req.getLastName());
        doctor.setEmail(req.getEmail());
        doctor.setPhone(req.getPhone());
        doctor.setPassword(passwordEncoder.encode(req.getPassword()));
        doctor.setSpecialization(req.getSpecialization());
        doctor.setDepartment(req.getDepartment());
        doctor.setQualification(req.getQualification());
        doctor.setExperienceYears(req.getExperienceYears());
        doctor.setBio(req.getBio());
        doctor.setConsultationFee(req.getConsultationFee());
        doctor.setAvailableDays(req.getAvailableDays());
        doctor.setAvailableFrom(req.getAvailableFrom());
        doctor.setAvailableTo(req.getAvailableTo());
        doctor.setAvailableTimeSlots(req.getAvailableTimeSlots());

        Doctor saved = doctorRepository.save(doctor);
        return ResponseEntity.ok(buildJwt(saved));
    }
}
