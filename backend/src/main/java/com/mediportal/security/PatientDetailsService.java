package com.mediportal.security;

import com.mediportal.model.Doctor;
import com.mediportal.model.Patient;
import com.mediportal.repository.DoctorRepository;
import com.mediportal.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class PatientDetailsService implements UserDetailsService {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Try patient first
        Optional<Patient> patient = patientRepository.findByEmail(email);
        if (patient.isPresent()) {
            return User.builder()
                    .username(patient.get().getEmail())
                    .password(patient.get().getPassword())
                    .authorities("ROLE_PATIENT")
                    .build();
        }

        // Try doctor
        Optional<Doctor> doctor = doctorRepository.findByEmail(email);
        if (doctor.isPresent()) {
            return User.builder()
                    .username(doctor.get().getEmail())
                    .password(doctor.get().getPassword())
                    .authorities("ROLE_DOCTOR")
                    .build();
        }

        throw new UsernameNotFoundException("User not found with email: " + email);
    }
}

