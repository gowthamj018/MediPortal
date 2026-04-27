package com.mediportal.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.Random;

@Service
public class SmsService {

    private static final Logger logger = LoggerFactory.getLogger(SmsService.class);
    private static final String FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

    private final Random random = new SecureRandom();
    private final RestTemplate restTemplate;

    @Value("${app.sms.provider:mock}")
    private String smsProvider;

    @Value("${app.sms.fast2sms.api-key:}")
    private String fast2smsApiKey;

    public SmsService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String generateOtp() {
        return String.format("%06d", random.nextInt(999999));
    }

    public void sendOtp(String phone, String otp) {
        String provider = smsProvider == null ? "mock" : smsProvider.trim().toLowerCase(Locale.ROOT);

        if ("fast2sms".equals(provider)) {
            sendOtpViaFast2Sms(phone, otp);
        } else {
            logMockSms(phone, otp);
        }
    }

    // -------------------------------------------------------
    // Fast2SMS — OTP Route (Dev API)
    // POST https://www.fast2sms.com/dev/bulkV2
    // Header:  authorization: <API_KEY>
    // Body:    route=otp&variables_values=<OTP>&numbers=<PHONE>
    // -------------------------------------------------------
    private void sendOtpViaFast2Sms(String phone, String otp) {
        if (isBlank(fast2smsApiKey)) {
            logger.error("Fast2SMS provider enabled but API key is missing (app.sms.fast2sms.api-key).");
            throw new IllegalStateException("SMS provider misconfiguration: Fast2SMS API key not set");
        }

        // Fast2SMS expects a bare 10-digit Indian mobile number (no country code)
        String normalizedPhone = normalizePhone(phone);
        String message = "Your MediVault OTP is " + otp + ". Valid for 5 minutes. Do not share.";

        // Fast2SMS Quick SMS (q route) - works on free plan with wallet balance
        // Uses GET with query params as per Fast2SMS documentation
        String url = FAST2SMS_URL
                + "?authorization=" + fast2smsApiKey
                + "&route=q"
                + "&message=" + java.net.URLEncoder.encode(message, java.nio.charset.StandardCharsets.UTF_8)
                + "&flash=0"
                + "&numbers=" + normalizedPhone;

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            logger.info("Fast2SMS response: status={}, body={}", response.getStatusCode(), response.getBody());

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("Fast2SMS OTP send failed. status={}, body={}", response.getStatusCode(), response.getBody());
                throw new IllegalStateException("Failed to deliver OTP via Fast2SMS");
            }

            logger.info("OTP sent successfully via Fast2SMS to [{}]", normalizedPhone);
        } catch (RestClientException ex) {
            logger.error("Error calling Fast2SMS API", ex);
            throw new IllegalStateException("Failed to deliver OTP via Fast2SMS");
        }
    }

    /**
     * Normalizes an Indian phone number to the bare 10-digit format
     * expected by Fast2SMS (strips +91 / 91 / spaces / dashes).
     */
    private String normalizePhone(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("\\D", "");          // remove non-digits
        if (digits.length() >= 12 && digits.startsWith("91")) {
            return digits.substring(2);                        // 91XXXXXXXXXX -> XXXXXXXXXX
        }
        return digits;
    }

    private void logMockSms(String phone, String otp) {
        logger.info("==========================================");
        logger.info("[MOCK SMS] app.sms.provider=mock");
        logger.info("[MOCK SMS] To: {} | OTP: {}", phone, otp);
        logger.info("==========================================");
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
