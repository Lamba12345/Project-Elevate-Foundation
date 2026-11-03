package org.elevate.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Entity: VolunteerApplication
 * Stores volunteer registration forms in the SQLite database.
 * Table: volunteer_applications
 */
@Entity
@Table(name = "volunteer_applications")
@Data
public class VolunteerApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @Email @NotBlank
    private String email;

    private String phone;

    @NotBlank
    private String country;

    @NotBlank
    private String role;

    @NotBlank
    private String availability;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Status { PENDING, APPROVED, REJECTED }
}
