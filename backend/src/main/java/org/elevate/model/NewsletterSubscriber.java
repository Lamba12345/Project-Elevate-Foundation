package org.elevate.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Entity: NewsletterSubscriber
 * Stores newsletter email subscriptions in the SQLite database.
 * Table: newsletter_subscribers
 */
@Entity
@Table(name = "newsletter_subscribers")
@Data
public class NewsletterSubscriber {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Email @NotBlank
    @Column(unique = true)
    private String email;

    private boolean active = true;

    private LocalDateTime subscribedAt = LocalDateTime.now();
}
