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
    @Size(min = 6, max = 40)
    private String password;

    private String phone;
    private String specialization;
    private String department;
    private String qualification;
    private Integer experienceYears;
    private String bio;
    private Double consultationFee;
    private String availableDays;
    private String availableFrom;
    private String availableTo;
}

