package com.mediportal.repository;

import com.mediportal.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    Optional<Doctor> findByEmail(String email);
    Optional<Doctor> findByPhone(String phone);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    List<Doctor> findBySpecialization(String specialization);
    List<Doctor> findByDepartment(String department);
    List<Doctor> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(String firstName, String lastName);
}

