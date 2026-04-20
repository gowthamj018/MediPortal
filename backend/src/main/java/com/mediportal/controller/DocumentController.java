package com.mediportal.controller;

import com.mediportal.model.Appointment;
import com.mediportal.model.Document;
import com.mediportal.model.Patient;
import com.mediportal.repository.AppointmentRepository;
import com.mediportal.repository.DocumentRepository;
import com.mediportal.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    private Patient getCurrentPatient(Authentication auth) {
        return patientRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllDocuments(Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        List<Map<String, Object>> docs = documentRepository.findAllByPatientId(patient.getId())
                .stream()
                .map(this::toMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(docs);
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<Map<String, Object>>> getDocumentsByAppointment(
            @PathVariable Long appointmentId, Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        Appointment appointment = appointmentRepository.findById(appointmentId).orElseThrow();
        if (!appointment.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).build();
        }
        List<Map<String, Object>> docs = documentRepository.findByAppointmentId(appointmentId)
                .stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(docs);
    }

    @PostMapping("/upload/{appointmentId}")
    public ResponseEntity<?> uploadDocument(
            @PathVariable Long appointmentId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "documentType", defaultValue = "OTHER") String documentType,
            @RequestParam(value = "description", required = false) String description,
            Authentication auth) throws IOException {

        Patient patient = getCurrentPatient(auth);
        Appointment appointment = appointmentRepository.findById(appointmentId).orElseThrow();
        if (!appointment.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).build();
        }

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String uniqueFileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(uniqueFileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        Document doc = new Document();
        doc.setAppointment(appointment);
        doc.setPatient(patient);
        doc.setDoctor(appointment.getDoctor());
        doc.setFileName(uniqueFileName);
        doc.setOriginalName(file.getOriginalFilename());
        doc.setFileType(file.getContentType());
        doc.setFileSize(file.getSize());
        doc.setFilePath(filePath.toString());
        doc.setDocumentType(Document.DocumentType.valueOf(documentType));
        doc.setDescription(description);

        Document saved = documentRepository.save(doc);
        return ResponseEntity.ok(toMap(saved));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long id, Authentication auth) throws MalformedURLException {
        Patient patient = getCurrentPatient(auth);
        Document doc = documentRepository.findById(id).orElseThrow();

        if (!doc.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).build();
        }

        Path filePath = Paths.get(doc.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getFileType() != null ? doc.getFileType() : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getOriginalName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id, Authentication auth) throws IOException {
        Patient patient = getCurrentPatient(auth);
        Document doc = documentRepository.findById(id).orElseThrow();
        if (!doc.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).build();
        }
        if (doc.getFilePath() != null) {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
        }
        documentRepository.delete(doc);
        return ResponseEntity.ok(Map.of("message", "Document deleted successfully"));
    }

    private Map<String, Object> toMap(Document d) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("fileName", d.getFileName());
        map.put("originalName", d.getOriginalName());
        map.put("fileType", d.getFileType());
        map.put("fileSize", d.getFileSize());
        map.put("documentType", d.getDocumentType());
        map.put("description", d.getDescription());
        map.put("prescriptionText", d.getPrescriptionText());
        map.put("uploadedAt", d.getUploadedAt());
        map.put("patientId", d.getPatient() != null ? d.getPatient().getId() : null);
        map.put("patientName", d.getPatient() != null ? d.getPatient().getFirstName() + " " + d.getPatient().getLastName() : null);
        map.put("doctorName", d.getDoctor() != null ? "Dr. " + d.getDoctor().getFirstName() + " " + d.getDoctor().getLastName() : null);
        map.put("appointmentId", d.getAppointment() != null ? d.getAppointment().getId() : null);
        map.put("appointmentDate", d.getAppointment() != null ? d.getAppointment().getAppointmentDate() : null);
        return map;
    }
}

