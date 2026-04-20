package com.mediportal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PrescriptionRequest {
    @NotNull
    private Long patientId;

    private Long appointmentId;

    @NotBlank
    private String prescriptionText;

    private String description;
}

