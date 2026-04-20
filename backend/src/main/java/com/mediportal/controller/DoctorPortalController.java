package com.mediportal.controller;

import com.mediportal.dto.AppointmentResponse;
import com.mediportal.dto.MessageResponse;
import com.mediportal.dto.PrescriptionRequest;
import com.mediportal.model.*;
import com.mediportal.repository.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctor")
public class DoctorPortalController {

    @Autowired private DoctorRepository doctorRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private DocumentRepository documentRepository;

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    private Doctor getCurrentDoctor(Authentication auth) {
        return doctorRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        LocalDate today = LocalDate.now();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("doctorId", doctor.getId());
        stats.put("name", "Dr. " + doctor.getFirstName() + " " + doctor.getLastName());
        stats.put("specialization", doctor.getSpecialization());
        stats.put("todayAppointments", appointmentRepository.findTodayByDoctorId(doctor.getId(), today).size());
        stats.put("upcomingAppointments", appointmentRepository.findUpcomingByDoctorId(doctor.getId(), today).size());
        stats.put("totalPatients", appointmentRepository.countDistinctPatientsByDoctorId(doctor.getId()));
        stats.put("totalReports", documentRepository.findAllByDoctorId(doctor.getId()).size());

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentResponse>> getAllAppointments(Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        List<AppointmentResponse> appointments = appointmentRepository
                .findByDoctorIdOrderByAppointmentDateDescAppointmentTimeDesc(doctor.getId())
                .stream().map(AppointmentResponse::fromAppointment).collect(Collectors.toList());
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/appointments/upcoming")
    public ResponseEntity<List<AppointmentResponse>> getUpcoming(Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        List<AppointmentResponse> appointments = appointmentRepository
                .findUpcomingByDoctorId(doctor.getId(), LocalDate.now())
                .stream().map(AppointmentResponse::fromAppointment).collect(Collectors.toList());
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/appointments/today")
    public ResponseEntity<List<AppointmentResponse>> getToday(Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        List<AppointmentResponse> appointments = appointmentRepository
                .findTodayByDoctorId(doctor.getId(), LocalDate.now())
                .stream().map(AppointmentResponse::fromAppointment).collect(Collectors.toList());
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/patients")
    public ResponseEntity<List<Map<String, Object>>> getPatients(Authentication auth) {
        // Return all patients for the doctor to select from
        List<Map<String, Object>> patients = patientRepository.findAll().stream().map(p -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId());
            map.put("firstName", p.getFirstName());
            map.put("lastName", p.getLastName());
            map.put("email", p.getEmail());
            map.put("phone", p.getPhone());
            map.put("gender", p.getGender());
            map.put("bloodGroup", p.getBloodGroup());
            map.put("age", p.getAge());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(patients);
    }

    @PostMapping("/prescriptions")
    public ResponseEntity<?> createPrescription(
            @Valid @RequestBody PrescriptionRequest request, Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            appointment = appointmentRepository.findById(request.getAppointmentId()).orElse(null);
        }

        Document doc = new Document();
        doc.setPatient(patient);
        doc.setDoctor(doctor);
        doc.setAppointment(appointment);
        doc.setDocumentType(Document.DocumentType.PRESCRIPTION);
        doc.setPrescriptionText(request.getPrescriptionText());
        doc.setDescription(request.getDescription() != null ? request.getDescription() : "Prescription");
        doc.setOriginalName("Prescription - Dr. " + doctor.getFirstName() + " " + doctor.getLastName());

        Document saved = documentRepository.save(doc);
        return ResponseEntity.ok(toDocMap(saved));
    }

    @PostMapping("/documents/upload")
    public ResponseEntity<?> uploadReport(
            @RequestParam("file") MultipartFile file,
            @RequestParam("patientId") Long patientId,
            @RequestParam(value = "appointmentId", required = false) Long appointmentId,
            @RequestParam("documentType") String documentType,
            @RequestParam(value = "description", required = false) String description,
            Authentication auth) throws IOException {

        Doctor doctor = getCurrentDoctor(auth);
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        Appointment appointment = null;
        if (appointmentId != null) {
            appointment = appointmentRepository.findById(appointmentId).orElse(null);
        }

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String uniqueFileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(uniqueFileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        Document doc = new Document();
        doc.setPatient(patient);
        doc.setDoctor(doctor);
        doc.setAppointment(appointment);
        doc.setFileName(uniqueFileName);
        doc.setOriginalName(file.getOriginalFilename());
        doc.setFileType(file.getContentType());
        doc.setFileSize(file.getSize());
        doc.setFilePath(filePath.toString());
        doc.setDocumentType(Document.DocumentType.valueOf(documentType));
        doc.setDescription(description);

        Document saved = documentRepository.save(doc);
        return ResponseEntity.ok(toDocMap(saved));
    }

    private Map<String, Object> toDocMap(Document d) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("documentType", d.getDocumentType());
        map.put("prescriptionText", d.getPrescriptionText());
        map.put("originalName", d.getOriginalName());
        map.put("description", d.getDescription());
        map.put("uploadedAt", d.getUploadedAt());
        map.put("patientName", d.getPatient().getFirstName() + " " + d.getPatient().getLastName());
        map.put("doctorName", "Dr. " + d.getDoctor().getFirstName() + " " + d.getDoctor().getLastName());
        return map;
    }
}

