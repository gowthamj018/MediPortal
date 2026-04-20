package com.mediportal.repository;

import com.mediportal.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    // Patient-side queries
    List<Appointment> findByPatientIdOrderByAppointmentDateDescAppointmentTimeDesc(Long patientId);

    @Query("SELECT a FROM Appointment a WHERE a.patient.id = :patientId AND a.appointmentDate >= :today ORDER BY a.appointmentDate ASC, a.appointmentTime ASC")
    List<Appointment> findUpcomingByPatientId(@Param("patientId") Long patientId, @Param("today") LocalDate today);

    @Query("SELECT a FROM Appointment a WHERE a.patient.id = :patientId AND a.appointmentDate < :today ORDER BY a.appointmentDate DESC")
    List<Appointment> findPastByPatientId(@Param("patientId") Long patientId, @Param("today") LocalDate today);

    boolean existsByDoctorIdAndAppointmentDateAndAppointmentTime(Long doctorId, LocalDate date, LocalTime time);

    // Doctor-side queries
    List<Appointment> findByDoctorIdOrderByAppointmentDateDescAppointmentTimeDesc(Long doctorId);

    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate >= :today AND a.status <> 'CANCELLED' ORDER BY a.appointmentDate ASC, a.appointmentTime ASC")
    List<Appointment> findUpcomingByDoctorId(@Param("doctorId") Long doctorId, @Param("today") LocalDate today);

    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate = :today AND a.status <> 'CANCELLED' ORDER BY a.appointmentTime ASC")
    List<Appointment> findTodayByDoctorId(@Param("doctorId") Long doctorId, @Param("today") LocalDate today);

    // Booked slots query
    List<Appointment> findByDoctorIdAndAppointmentDate(Long doctorId, LocalDate date);

    @Query("SELECT a.appointmentTime FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate = :date AND a.status <> 'CANCELLED'")
    List<LocalTime> findBookedSlots(@Param("doctorId") Long doctorId, @Param("date") LocalDate date);

    // Count distinct patients for a doctor
    @Query("SELECT COUNT(DISTINCT a.patient.id) FROM Appointment a WHERE a.doctor.id = :doctorId")
    long countDistinctPatientsByDoctorId(@Param("doctorId") Long doctorId);
}

