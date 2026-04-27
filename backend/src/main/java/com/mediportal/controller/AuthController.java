package com.mediportal.controller;

import com.mediportal.dto.*;
import com.mediportal.model.Doctor;
import com.mediportal.model.Patient;
import com.mediportal.repository.DoctorRepository;
import com.mediportal.repository.PatientRepository;
import com.mediportal.security.JwtUtils;
import com.mediportal.service.RedisService;
import com.mediportal.service.SmsService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    PatientRepository patientRepository;

    @Autowired
    DoctorRepository doctorRepository;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    RedisService redisService;

    @Autowired
    SmsService smsService;

    @PostMapping("/generate-otp")
    public ResponseEntity<?> generateOtp(@Valid @RequestBody GenerateOtpRequest request) {
        if ("LOGIN".equalsIgnoreCase(request.getType())) {
            if (!patientRepository.existsByPhone(request.getPhone()) && !doctorRepository.existsByPhone(request.getPhone())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MessageResponse("Phone number not registered. Please register first."));
            }
        } else if ("REGISTER".equalsIgnoreCase(request.getType())) {
            if (patientRepository.existsByPhone(request.getPhone()) || doctorRepository.existsByPhone(request.getPhone())) {
                return ResponseEntity.badRequest().body(new MessageResponse("Phone number is already registered. Please sign in."));
            }
        }

        if (redisService.isRateLimited(request.getPhone())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(new MessageResponse("Too many requests. Please try again later."));
        }

        redisService.recordAttempt(request.getPhone());
        String otp = smsService.generateOtp();
        redisService.saveOtp(request.getPhone(), otp);
        try {
            smsService.sendOtp(request.getPhone(), otp);
        } catch (Exception ex) {
            redisService.clearOtp(request.getPhone());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new MessageResponse("Unable to send OTP right now. Please try again later."));
        }

        return ResponseEntity.ok(new MessageResponse("OTP sent successfully."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        String savedOtp = redisService.getOtp(loginRequest.getPhone());
        
        if (savedOtp == null || !savedOtp.equals(loginRequest.getOtp())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid or expired OTP."));
        }

        // Try patient
        Optional<Patient> patientOpt = patientRepository.findByPhone(loginRequest.getPhone());
        if (patientOpt.isPresent()) {
            Patient p = patientOpt.get();
            String jwt = jwtUtils.generateTokenFromPhone(p.getPhone(), "ROLE_PATIENT");
            redisService.clearOtp(loginRequest.getPhone());
            redisService.clearAttempts(loginRequest.getPhone());
            return ResponseEntity.ok(new JwtResponse(jwt, p.getId(), p.getFirstName(), p.getLastName(), p.getPhone(), "PATIENT"));
        }

        // Try doctor
        Optional<Doctor> doctorOpt = doctorRepository.findByPhone(loginRequest.getPhone());
        if (doctorOpt.isPresent()) {
            Doctor d = doctorOpt.get();
            String jwt = jwtUtils.generateTokenFromPhone(d.getPhone(), "ROLE_DOCTOR");
            redisService.clearOtp(loginRequest.getPhone());
            redisService.clearAttempts(loginRequest.getPhone());
            return ResponseEntity.ok(new JwtResponse(jwt, d.getId(), d.getFirstName(), d.getLastName(), d.getPhone(), "DOCTOR"));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MessageResponse("Phone number not registered."));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        String savedOtp = redisService.getOtp(registerRequest.getPhone());
        if (savedOtp == null || !savedOtp.equals(registerRequest.getOtp())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid or expired OTP."));
        }

        if (patientRepository.existsByPhone(registerRequest.getPhone()) || doctorRepository.existsByPhone(registerRequest.getPhone())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Phone is already registered!"));
        }

        Patient patient = new Patient();
        patient.setFirstName(registerRequest.getFirstName());
        patient.setLastName(registerRequest.getLastName());
        patient.setEmail(registerRequest.getEmail());
        patient.setPhone(registerRequest.getPhone());
        patient.setDateOfBirth(registerRequest.getDateOfBirth());
        patient.setGender(registerRequest.getGender());
        patient.setBloodGroup(registerRequest.getBloodGroup());
        patient.setWeight(registerRequest.getWeight());
        patient.setHeight(registerRequest.getHeight());
        patient.setAge(registerRequest.getAge());

        Patient savedPatient = patientRepository.save(patient);
        String jwt = jwtUtils.generateTokenFromPhone(savedPatient.getPhone(), "ROLE_PATIENT");
        redisService.clearOtp(registerRequest.getPhone());
        redisService.clearAttempts(registerRequest.getPhone());

        return ResponseEntity.ok(new JwtResponse(jwt, savedPatient.getId(), savedPatient.getFirstName(), savedPatient.getLastName(), savedPatient.getPhone(), "PATIENT"));
    }

    @PostMapping("/register/doctor")
    public ResponseEntity<?> registerDoctor(@Valid @RequestBody DoctorRegisterRequest req) {
        String savedOtp = redisService.getOtp(req.getPhone());
        if (savedOtp == null || !savedOtp.equals(req.getOtp())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid or expired OTP."));
        }

        if (doctorRepository.existsByPhone(req.getPhone()) || patientRepository.existsByPhone(req.getPhone())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Phone is already registered!"));
        }

        Doctor doctor = new Doctor();
        doctor.setFirstName(req.getFirstName());
        doctor.setLastName(req.getLastName());
        doctor.setEmail(req.getEmail());
        doctor.setPhone(req.getPhone());
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

        Doctor savedDoctor = doctorRepository.save(doctor);
        String jwt = jwtUtils.generateTokenFromPhone(savedDoctor.getPhone(), "ROLE_DOCTOR");
        redisService.clearOtp(req.getPhone());
        redisService.clearAttempts(req.getPhone());

        return ResponseEntity.ok(new JwtResponse(jwt, savedDoctor.getId(), savedDoctor.getFirstName(), savedDoctor.getLastName(), savedDoctor.getPhone(), "DOCTOR"));
    }
}

