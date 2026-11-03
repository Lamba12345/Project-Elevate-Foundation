package org.elevate.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.HexFormat;

/**
 * Security utilities for Project Elevate:
 * - BCrypt password hashing & verification
 * - Cryptographically secure token generation
 */
@Component
public class SecurityUtils {

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
    private final SecureRandom secureRandom = new SecureRandom();

    public String hashPassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("Password cannot be empty");
        }
        return passwordEncoder.encode(rawPassword);
    }

    public boolean checkPassword(String rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) {
            return false;
        }
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }

    public String generateToken() {
        byte[] bytes = new byte[32]; // 256-bit token
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}

