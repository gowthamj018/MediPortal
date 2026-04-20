package com.mediportal.controller;

import com.mediportal.dto.*;
import com.mediportal.model.Doctor;
import com.mediportal.model.Patient;
import com.mediportal.repository.DoctorRepository;
import com.mediportal.repository.PatientRepository;
import com.mediportal.security.JwtUtils;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    PatientRepository patientRepository;

    @Autowired
    DoctorRepository doctorRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        String role = jwtUtils.getRoleFromJwtToken(jwt);

        if ("ROLE_DOCTOR".equals(role)) {
            Doctor doctor = doctorRepository.findByEmail(loginRequest.getEmail()).orElseThrow();
            return ResponseEntity.ok(new JwtResponse(jwt, doctor.getId(), doctor.getFirstName(),
                    doctor.getLastName(), doctor.getEmail(), "DOCTOR"));
        } else {
            Patient patient = patientRepository.findByEmail(loginRequest.getEmail()).orElseThrow();
            return ResponseEntity.ok(new JwtResponse(jwt, patient.getId(), patient.getFirstName(),
                    patient.getLastName(), patient.getEmail(), "PATIENT"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        if (patientRepository.existsByEmail(registerRequest.getEmail())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already registered!"));
        }
        if (doctorRepository.existsByEmail(registerRequest.getEmail())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already registered!"));
        }

        Patient patient = new Patient();
        patient.setFirstName(registerRequest.getFirstName());
        patient.setLastName(registerRequest.getLastName());
        patient.setEmail(registerRequest.getEmail());
        patient.setPassword(encoder.encode(registerRequest.getPassword()));
        patient.setPhone(registerRequest.getPhone());
        patient.setDateOfBirth(registerRequest.getDateOfBirth());
        patient.setGender(registerRequest.getGender());
        patient.setBloodGroup(registerRequest.getBloodGroup());
        patient.setWeight(registerRequest.getWeight());
        patient.setHeight(registerRequest.getHeight());
        patient.setAge(registerRequest.getAge());

        patientRepository.save(patient);

        return ResponseEntity.ok(new MessageResponse("Patient registered successfully!"));
    }

    @PostMapping("/register/doctor")
    public ResponseEntity<?> registerDoctor(@Valid @RequestBody DoctorRegisterRequest req) {
        if (doctorRepository.existsByEmail(req.getEmail())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already registered!"));
        }
        if (patientRepository.existsByEmail(req.getEmail())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already registered!"));
        }

        Doctor doctor = new Doctor();
        doctor.setFirstName(req.getFirstName());
        doctor.setLastName(req.getLastName());
        doctor.setEmail(req.getEmail());
        doctor.setPassword(encoder.encode(req.getPassword()));
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

        doctorRepository.save(doctor);

        return ResponseEntity.ok(new MessageResponse("Doctor registered successfully!"));
    }
}

