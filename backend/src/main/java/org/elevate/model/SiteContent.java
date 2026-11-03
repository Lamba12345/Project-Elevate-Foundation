package org.elevate.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity: SiteContent
 * Stores all inline-editable website text and image references by unique content key.
 * Table: site_content
 */
@Entity
@Table(name = "site_content", indexes = {
    @Index(name = "idx_content_key", columnList = "contentKey", unique = true),
    @Index(name = "idx_page", columnList = "page")
})
@Data
@NoArgsConstructor
public class SiteContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "content_key", unique = true, nullable = false)
    private String contentKey;

    private String page; // e.g. "home", "about", "programs", "blog", "global"

    private String contentType = "text"; // "text", "html", "image", "number"

    @Lob
    @Column(name = "content_value", columnDefinition = "TEXT")
    private String contentValue;

    private String label; // Human-friendly label for editor UI

    private LocalDateTime lastUpdated = LocalDateTime.now();

    private String updatedBy;

    public SiteContent(String contentKey, String page, String contentType, String contentValue, String label, String updatedBy) {
        this.contentKey = contentKey;
        this.page = page;
        this.contentType = contentType;
        this.contentValue = contentValue;
        this.label = label;
        this.updatedBy = updatedBy;
        this.lastUpdated = LocalDateTime.now();
    }
}

