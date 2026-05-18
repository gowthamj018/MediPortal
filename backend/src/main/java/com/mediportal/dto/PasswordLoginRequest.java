package com.mediportal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PasswordLoginRequest {
    @NotBlank
    private String identifier; // phone or email

    @NotBlank
    private String password;
}
