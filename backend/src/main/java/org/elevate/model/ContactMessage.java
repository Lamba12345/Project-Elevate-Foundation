package org.elevate.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Entity: ContactMessage
 * Stores contact form submissions in the SQLite database.
 * Table: contact_messages
 */
@Entity
@Table(name = "contact_messages")
@Data
public class ContactMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @Email @NotBlank
    private String email;

    @NotBlank
    private String subject;

    private String department;

    @Column(columnDefinition = "TEXT")
    @NotBlank
    private String message;

    @Enumerated(EnumType.STRING)
    private Status status = Status.NEW;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Status { NEW, READ, REPLIED }
}
