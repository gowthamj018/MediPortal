package com.mediportal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GenerateOtpRequest {
    @NotBlank
    private String phone;
    
    private String type; // LOGIN or REGISTER
}
