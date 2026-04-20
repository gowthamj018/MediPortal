package com.mediportal.repository;

import com.mediportal.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByAppointmentId(Long appointmentId);

    @Query("SELECT d FROM Document d WHERE d.patient.id = :patientId ORDER BY d.uploadedAt DESC")
    List<Document> findAllByPatientId(@Param("patientId") Long patientId);

    @Query("SELECT d FROM Document d WHERE d.doctor.id = :doctorId ORDER BY d.uploadedAt DESC")
    List<Document> findAllByDoctorId(@Param("doctorId") Long doctorId);

    @Query("SELECT d FROM Document d WHERE d.patient.id = :patientId AND d.documentType = :type ORDER BY d.uploadedAt DESC")
    List<Document> findByPatientIdAndType(@Param("patientId") Long patientId, @Param("type") Document.DocumentType type);

    List<Document> findByPatientIdAndDocumentType(Long patientId, Document.DocumentType documentType);
}

