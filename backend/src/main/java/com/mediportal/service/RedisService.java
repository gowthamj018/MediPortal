package com.mediportal.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RedisService {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String OTP_PREFIX = "OTP:";
    private static final String ATTEMPTS_PREFIX = "ATTEMPTS:";
    private static final long OTP_EXPIRATION_MINUTES = 5;
    private static final int MAX_ATTEMPTS = 5;

    public void saveOtp(String phone, String otp) {
        redisTemplate.opsForValue().set(OTP_PREFIX + phone, otp, Duration.ofMinutes(OTP_EXPIRATION_MINUTES));
    }

    public String getOtp(String phone) {
        return redisTemplate.opsForValue().get(OTP_PREFIX + phone);
    }

    public void clearOtp(String phone) {
        redisTemplate.delete(OTP_PREFIX + phone);
    }

    public boolean isRateLimited(String phone) {
        String attemptsStr = redisTemplate.opsForValue().get(ATTEMPTS_PREFIX + phone);
        if (attemptsStr != null && Integer.parseInt(attemptsStr) >= MAX_ATTEMPTS) {
            return true;
        }
        return false;
    }

    public void recordAttempt(String phone) {
        redisTemplate.opsForValue().increment(ATTEMPTS_PREFIX + phone);
        redisTemplate.expire(ATTEMPTS_PREFIX + phone, Duration.ofMinutes(15));
    }
    
    public void clearAttempts(String phone) {
        redisTemplate.delete(ATTEMPTS_PREFIX + phone);
    }
}
