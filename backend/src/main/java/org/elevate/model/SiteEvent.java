package org.elevate.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity: SiteEvent
 * Stores upcoming events, community summits, and workshops.
 * Table: site_events
 */
@Entity
@Table(name = "site_events")
@Data
@NoArgsConstructor
public class SiteEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String title;

    @NotBlank
    private String eventDate; // e.g. "November 25, 2026"

    private String eventTime; // e.g. "10:00 AM - 2:00 PM GMT"

    private String location; // e.g. "Accra Community Centre & Live Stream"

    @Lob
    @Column(columnDefinition = "TEXT")
    private String description;

    private String category = "Workshop"; // Fundraiser, Workshop, Community Outreach, Webinar

    private String registerUrl = "contact.html";

    private String status = "Upcoming"; // Upcoming, Registration Open, Completed

    private LocalDateTime createdAt = LocalDateTime.now();
}

