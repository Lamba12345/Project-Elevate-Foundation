package org.elevate.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity: AuthSession
 * Stores active editor login session tokens.
 * Table: auth_sessions
 */
@Entity
@Table(name = "auth_sessions", indexes = {
    @Index(name = "idx_token", columnList = "token", unique = true)
})
@Data
@NoArgsConstructor
public class AuthSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 128)
    private String token;

    @Column(nullable = false)
    private String username;

    private String role;

    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    public AuthSession(String token, String username, String role, LocalDateTime expiresAt) {
        this.token = token;
        this.username = username;
        this.role = role;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = expiresAt;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}

