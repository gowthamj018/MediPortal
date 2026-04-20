package com.mediportal.dto;

import com.mediportal.model.Appointment;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class AppointmentResponse {
    private Long id;
    private Long patientId;
    private String patientName;
    private Long doctorId;
    private String doctorName;
    private String doctorSpecialization;
    private String doctorDepartment;
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;
    private Appointment.AppointmentStatus status;
    private String reason;
    private String notes;
    private String appointmentType;
    private LocalDateTime createdAt;
    private int documentCount;
    private boolean rated; // whether this appointment has been rated

    public static AppointmentResponse fromAppointment(Appointment a) {
        return fromAppointment(a, false);
    }

    public static AppointmentResponse fromAppointment(Appointment a, boolean rated) {
        AppointmentResponse dto = new AppointmentResponse();
        dto.setId(a.getId());
        dto.setPatientId(a.getPatient().getId());
        dto.setPatientName(a.getPatient().getFirstName() + " " + a.getPatient().getLastName());
        dto.setDoctorId(a.getDoctor().getId());
        dto.setDoctorName("Dr. " + a.getDoctor().getFirstName() + " " + a.getDoctor().getLastName());
        dto.setDoctorSpecialization(a.getDoctor().getSpecialization());
        dto.setDoctorDepartment(a.getDoctor().getDepartment());
        dto.setAppointmentDate(a.getAppointmentDate());
        dto.setAppointmentTime(a.getAppointmentTime());
        dto.setStatus(a.getStatus());
        dto.setReason(a.getReason());
        dto.setNotes(a.getNotes());
        dto.setAppointmentType(a.getAppointmentType());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setDocumentCount(a.getDocuments() != null ? a.getDocuments().size() : 0);
        dto.setRated(rated);
        return dto;
    }
}

