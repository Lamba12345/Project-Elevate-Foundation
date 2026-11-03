package org.elevate.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Entity: Donation
 * Tracks all donation records in the SQLite database.
 * Table: donations
 */
@Entity
@Table(name = "donations")
@Data
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @Email @NotBlank
    private String email;

    @Min(1)
    private Double amount;

    /** One-time, Monthly, Annually */
    private String frequency;

    /** Which program the donation is designated to */
    private String program;

    @Column(columnDefinition = "TEXT")
    private String message;

    private LocalDateTime createdAt = LocalDateTime.now();
}
