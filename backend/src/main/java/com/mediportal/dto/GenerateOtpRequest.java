package com.mediportal.dto;

import lombok.Data;

@Data
public class GenerateOtpRequest {
    // identifier accepts phone (+91XXXXXXXXXX) OR email.
    // Kept as String (no @NotBlank) so legacy callers can still use `phone` field.
    private String identifier;

    // Legacy field — RegisterPage still sends { phone, type }
    private String phone;

    private String type; // LOGIN | REGISTER | FORGOT_PASSWORD

    /** Returns the effective identifier, preferring `identifier` over legacy `phone`. */
    public String resolvedIdentifier() {
        return (identifier != null && !identifier.isBlank()) ? identifier : phone;
    }
}
