package org.elevate.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity: NewsArticle
 * Stores news articles and field reports for Project Elevate Foundation.
 * Table: news_articles
 */
@Entity
@Table(name = "news_articles")
@Data
@NoArgsConstructor
public class NewsArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @NotBlank
    private String category = "community"; // education, community, empowerment, health, volunteer

    private String publishDate;

    private String readTime = "4 min read";

    private String author = "Project Elevate Team";

    @Lob
    @Column(columnDefinition = "TEXT")
    private String excerpt;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;

    private String imageUrl = "assets/images/program_education.jpg";

    private boolean featured = false;

    private int displayOrder = 0;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();
}

