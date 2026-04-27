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
    public UserDetails loadUserByUsername(String phone) throws UsernameNotFoundException {
        // Try patient first
        Optional<Patient> patient = patientRepository.findByPhone(phone);
        if (patient.isPresent()) {
            return User.builder()
                    .username(patient.get().getPhone())
                    .password("") // Password is no longer used

                    .authorities("ROLE_PATIENT")
                    .build();
        }

        // Try doctor
        Optional<Doctor> doctor = doctorRepository.findByPhone(phone);
        if (doctor.isPresent()) {
            return User.builder()
                    .username(doctor.get().getPhone())
                    .password("") // Password is no longer used
                    .authorities("ROLE_DOCTOR")
                    .build();
        }

        throw new UsernameNotFoundException("User not found with phone: " + phone);
    }
}

