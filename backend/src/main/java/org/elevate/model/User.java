package org.elevate.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity: User
 * Stores authorized editor accounts with BCrypt-hashed passwords.
 * Table: users
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(unique = true, nullable = false)
    private String username;

    @NotBlank
    @Column(nullable = false)
    @JsonIgnore
    private String password; // BCrypt hash

    private String fullName;

    private String role = "EDITOR"; // e.g. EDITOR, ADMIN

    private boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();

    public User(String username, String password, String fullName, String role) {
        this.username = username;
        this.password = password;
        this.fullName = fullName;
        this.role = role;
        this.createdAt = LocalDateTime.now();
    }
}

