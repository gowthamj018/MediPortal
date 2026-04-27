package com.mediportal.controller;

import com.mediportal.dto.AppointmentResponse;
import com.mediportal.dto.DoctorResponse;
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
        return doctorRepository.findByPhone(auth.getName()).orElseThrow();
    }

    @GetMapping("/profile")
    public ResponseEntity<DoctorResponse> getProfile(Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        return ResponseEntity.ok(DoctorResponse.fromDoctor(doctor));
    }

    @PutMapping("/profile")
    public ResponseEntity<DoctorResponse> updateProfile(@RequestBody Map<String, Object> updates, Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        if (updates.containsKey("firstName")) doctor.setFirstName((String) updates.get("firstName"));
        if (updates.containsKey("lastName")) doctor.setLastName((String) updates.get("lastName"));
        if (updates.containsKey("phone")) doctor.setPhone((String) updates.get("phone"));
        if (updates.containsKey("department")) doctor.setDepartment((String) updates.get("department"));
        if (updates.containsKey("specialization")) doctor.setSpecialization((String) updates.get("specialization"));
        if (updates.containsKey("qualification")) doctor.setQualification((String) updates.get("qualification"));
        if (updates.containsKey("experienceYears")) {
            Object exp = updates.get("experienceYears");
            if (exp != null) doctor.setExperienceYears(exp instanceof Integer ? (Integer) exp : Integer.parseInt(exp.toString()));
        }
        if (updates.containsKey("consultationFee")) {
            Object fee = updates.get("consultationFee");
            if (fee != null) doctor.setConsultationFee(fee instanceof Double ? (Double) fee : Double.parseDouble(fee.toString()));
        }
        if (updates.containsKey("availableDays")) doctor.setAvailableDays((String) updates.get("availableDays"));
        if (updates.containsKey("availableTimeSlots")) doctor.setAvailableTimeSlots((String) updates.get("availableTimeSlots"));
        if (updates.containsKey("bio")) doctor.setBio((String) updates.get("bio"));

        Doctor saved = doctorRepository.save(doctor);
        return ResponseEntity.ok(DoctorResponse.fromDoctor(saved));
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
        Doctor doctor = getCurrentDoctor(auth);
        List<Appointment> todayAppts = appointmentRepository.findTodayByDoctorId(doctor.getId(), LocalDate.now());
        
        List<Map<String, Object>> patients = todayAppts.stream()
                .map(Appointment::getPatient)
                .distinct()
                .map(p -> {
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

    @GetMapping("/patients/{patientId}/documents")
    public ResponseEntity<?> getPatientDocuments(@PathVariable Long patientId, Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        // Only allow doctors who have had an appointment with this patient to view their records
        boolean hasAppointment = appointmentRepository.findByDoctorIdOrderByAppointmentDateDescAppointmentTimeDesc(doctor.getId())
                .stream().anyMatch(a -> a.getPatient().getId().equals(patientId));
                
        if (!hasAppointment) {
            return ResponseEntity.badRequest().body(new MessageResponse("Unauthorized to view records for this patient."));
        }

        List<Map<String, Object>> docs = documentRepository.findAllByPatientId(patientId)
                .stream().map(this::toDocMap).collect(Collectors.toList());
        return ResponseEntity.ok(docs);
    }

    @PostMapping("/prescriptions")
    public ResponseEntity<?> createPrescription(
            @Valid @RequestBody PrescriptionRequest request, Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        List<Appointment> todayAppts = appointmentRepository.findTodayByDoctorId(doctor.getId(), LocalDate.now());
        boolean hasApptToday = todayAppts.stream().anyMatch(a -> a.getPatient().getId().equals(patient.getId()));
        if (!hasApptToday) {
            return ResponseEntity.badRequest().body(new MessageResponse("You can only write prescriptions for patients with an appointment today."));
        }

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            appointment = appointmentRepository.findById(request.getAppointmentId()).orElse(null);
        } else {
            appointment = todayAppts.stream().filter(a -> a.getPatient().getId().equals(patient.getId())).findFirst().orElse(null);
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

        List<Appointment> todayAppts = appointmentRepository.findTodayByDoctorId(doctor.getId(), LocalDate.now());
        boolean hasApptToday = todayAppts.stream().anyMatch(a -> a.getPatient().getId().equals(patient.getId()));
        if (!hasApptToday) {
            return ResponseEntity.badRequest().body(new MessageResponse("You can only upload reports for patients with an appointment today."));
        }

        Appointment appointment = null;
        if (appointmentId != null) {
            appointment = appointmentRepository.findById(appointmentId).orElse(null);
        } else {
            appointment = todayAppts.stream().filter(a -> a.getPatient().getId().equals(patient.getId())).findFirst().orElse(null);
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

    @DeleteMapping("/documents/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id, Authentication auth) throws IOException {
        Doctor doctor = getCurrentDoctor(auth);
        Document doc = documentRepository.findById(id).orElseThrow();
        
        // Ensure the document belongs to this doctor
        if (doc.getDoctor() != null && !doc.getDoctor().getId().equals(doctor.getId())) {
             return ResponseEntity.status(403).body(new MessageResponse("Unauthorized to delete this record"));
        }
        
        if (doc.getFilePath() != null) {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
        }
        documentRepository.delete(doc);
        return ResponseEntity.ok(Map.of("message", "Document deleted successfully"));
    }

    @PutMapping("/appointments/{id}/complete")
    public ResponseEntity<?> completeAppointment(@PathVariable Long id, Authentication auth) {
        Doctor doctor = getCurrentDoctor(auth);
        Appointment appointment = appointmentRepository.findById(id).orElseThrow();
        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Unauthorized"));
        }
        appointment.setStatus(Appointment.AppointmentStatus.COMPLETED);
        appointmentRepository.save(appointment);
        return ResponseEntity.ok(Map.of("message", "Appointment marked as completed"));
    }

    private Map<String, Object> toDocMap(Document d) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("fileName", d.getFileName());
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

