package org.elevate.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity: SiteAnnouncement
 * Stores website announcements and alert banners.
 * Table: site_announcements
 */
@Entity
@Table(name = "site_announcements")
@Data
@NoArgsConstructor
public class SiteAnnouncement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String title;

    @NotBlank
    @Column(columnDefinition = "TEXT")
    private String message;

    private String badge = "ANNOUNCEMENT";

    private String linkText;

    private String linkUrl;

    private boolean active = true;

    private String type = "info"; // info, success, warning, urgent

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();
}

