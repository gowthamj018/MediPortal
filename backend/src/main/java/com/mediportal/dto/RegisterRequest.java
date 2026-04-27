package com.mediportal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class RegisterRequest {
    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @Email
    private String email;

    @NotBlank
    private String phone;

    @NotBlank
    private String otp;
    private LocalDate dateOfBirth;
    private String gender;
    private String bloodGroup;
    private Double weight;  // in kg
    private Double height;  // in cm
    private Integer age;
}

