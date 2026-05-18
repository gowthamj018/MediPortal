package com.mediportal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DoctorRegisterRequest {
    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String phone;

    @NotBlank
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String specialization;

    @NotBlank
    private String department;

    @NotBlank
    private String qualification;

    private Integer experienceYears;
    private String bio;
    private Double consultationFee;

    @NotBlank
    private String availableDays;

    private String availableFrom;
    private String availableTo;

    @NotBlank
    private String availableTimeSlots;
}
