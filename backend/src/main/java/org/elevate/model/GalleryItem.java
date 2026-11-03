package org.elevate.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity: GalleryItem
 * Stores community photo gallery items, replacement images, and captions.
 * Table: gallery_items
 */
@Entity
@Table(name = "gallery_items")
@Data
@NoArgsConstructor
public class GalleryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String title;

    private String caption;

    @NotBlank
    @Column(nullable = false)
    private String imageUrl;

    private String category = "community"; // education, community, empowerment, impact

    private int displayOrder = 0;

    private LocalDateTime createdAt = LocalDateTime.now();

    public GalleryItem(String title, String caption, String imageUrl, String category, int displayOrder) {
        this.title = title;
        this.caption = caption;
        this.imageUrl = imageUrl;
        this.category = category;
        this.displayOrder = displayOrder;
        this.createdAt = LocalDateTime.now();
    }
}

