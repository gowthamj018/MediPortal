package com.mediportal.dto;

import lombok.Data;

@Data
public class LoginRequest {
    // Accepts phone (+91...) or email — either works
    private String identifier;

    // Legacy field kept for backward compat
    private String phone;

    private String otp;

    public String resolvedIdentifier() {
        return (identifier != null && !identifier.isBlank()) ? identifier : phone;
    }
}
