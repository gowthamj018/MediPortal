package com.mediportal.controller;

import com.mediportal.dto.AppointmentRequest;
import com.mediportal.dto.AppointmentResponse;
import com.mediportal.dto.MessageResponse;
import com.mediportal.model.Appointment;
import com.mediportal.model.Doctor;
import com.mediportal.model.DoctorRating;
import com.mediportal.model.Patient;
import com.mediportal.repository.AppointmentRepository;
import com.mediportal.repository.DoctorRatingRepository;
import com.mediportal.repository.DoctorRepository;
import com.mediportal.repository.PatientRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private DoctorRatingRepository ratingRepository;

    private Patient getCurrentPatient(Authentication auth) {
        return patientRepository.findByEmail(auth.getName()).orElseThrow();
    }

    private AppointmentResponse toResponse(Appointment a) {
        boolean rated = ratingRepository.existsByAppointmentId(a.getId());
        return AppointmentResponse.fromAppointment(a, rated);
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAllAppointments(Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        List<AppointmentResponse> appointments = appointmentRepository
                .findByPatientIdOrderByAppointmentDateDescAppointmentTimeDesc(patient.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<AppointmentResponse>> getUpcomingAppointments(Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        List<AppointmentResponse> appointments = appointmentRepository
                .findUpcomingByPatientId(patient.getId(), LocalDate.now())
                .stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/past")
    public ResponseEntity<List<AppointmentResponse>> getPastAppointments(Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        List<AppointmentResponse> appointments = appointmentRepository
                .findPastByPatientId(patient.getId(), LocalDate.now())
                .stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointmentById(@PathVariable Long id, Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        Appointment appointment = appointmentRepository.findById(id).orElseThrow();
        if (!appointment.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(toResponse(appointment));
    }

    @PostMapping
    public ResponseEntity<?> createAppointment(@Valid @RequestBody AppointmentRequest request, Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        Doctor doctor = doctorRepository.findById(request.getDoctorId()).orElseThrow();

        boolean slotTaken = appointmentRepository.existsByDoctorIdAndAppointmentDateAndAppointmentTime(
                doctor.getId(), request.getAppointmentDate(), request.getAppointmentTime());

        if (slotTaken) {
            return ResponseEntity.badRequest().body(new MessageResponse("This time slot is already booked."));
        }

        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setReason(request.getReason());
        appointment.setAppointmentType(request.getAppointmentType() != null ? request.getAppointmentType() : "In-Person");
        appointment.setNotes(request.getNotes());
        appointment.setStatus(Appointment.AppointmentStatus.SCHEDULED);

        Appointment saved = appointmentRepository.save(appointment);
        return ResponseEntity.ok(toResponse(saved));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelAppointment(@PathVariable Long id, Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        Appointment appointment = appointmentRepository.findById(id).orElseThrow();
        if (!appointment.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).build();
        }
        appointment.setStatus(Appointment.AppointmentStatus.CANCELLED);
        appointmentRepository.save(appointment);
        return ResponseEntity.ok(new MessageResponse("Appointment cancelled successfully."));
    }

    @PutMapping("/{id}/reschedule")
    public ResponseEntity<?> rescheduleAppointment(@PathVariable Long id,
            @RequestBody Map<String, String> body, Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        Appointment appointment = appointmentRepository.findById(id).orElseThrow();
        if (!appointment.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).build();
        }

        if (!"SCHEDULED".equals(appointment.getStatus().name()) && !"CONFIRMED".equals(appointment.getStatus().name())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Only scheduled or confirmed appointments can be rescheduled."));
        }

        LocalDate newDate = LocalDate.parse(body.get("appointmentDate"));
        LocalTime newTime = LocalTime.parse(body.get("appointmentTime"));

        boolean slotTaken = appointmentRepository.existsByDoctorIdAndAppointmentDateAndAppointmentTime(
                appointment.getDoctor().getId(), newDate, newTime);
        if (slotTaken) {
            return ResponseEntity.badRequest().body(new MessageResponse("This time slot is already booked."));
        }

        appointment.setAppointmentDate(newDate);
        appointment.setAppointmentTime(newTime);
        appointmentRepository.save(appointment);

        return ResponseEntity.ok(toResponse(appointment));
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<?> rateAppointment(@PathVariable Long id,
            @RequestBody Map<String, Object> body, Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        Appointment appointment = appointmentRepository.findById(id).orElseThrow();

        // Validate ownership
        if (!appointment.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Access denied."));
        }

        // Validate appointment is completed
        if (appointment.getStatus() != Appointment.AppointmentStatus.COMPLETED) {
            return ResponseEntity.badRequest().body(new MessageResponse("You can only rate completed appointments."));
        }

        // Validate not already rated
        if (ratingRepository.existsByAppointmentId(id)) {
            return ResponseEntity.badRequest().body(new MessageResponse("This appointment has already been rated."));
        }

        int ratingValue = ((Number) body.get("rating")).intValue();
        if (ratingValue < 1 || ratingValue > 5) {
            return ResponseEntity.badRequest().body(new MessageResponse("Rating must be between 1 and 5."));
        }

        String review = body.get("review") != null ? body.get("review").toString() : null;

        DoctorRating rating = new DoctorRating();
        rating.setDoctor(appointment.getDoctor());
        rating.setPatient(patient);
        rating.setAppointment(appointment);
        rating.setRating(ratingValue);
        rating.setReview(review);

        ratingRepository.save(rating);

        return ResponseEntity.ok(new MessageResponse("Thank you for your feedback!"));
    }

    @GetMapping("/booked-slots")
    public ResponseEntity<List<String>> getBookedSlots(
            @RequestParam Long doctorId, @RequestParam String date) {
        LocalDate localDate = LocalDate.parse(date);
        List<String> bookedSlots = appointmentRepository.findBookedSlots(doctorId, localDate)
                .stream()
                .map(t -> t.toString().substring(0, 5))
                .collect(Collectors.toList());
        return ResponseEntity.ok(bookedSlots);
    }
}

