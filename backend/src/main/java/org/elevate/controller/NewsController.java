package org.elevate.controller;

import jakarta.validation.Valid;
import org.elevate.model.NewsArticle;
import org.elevate.repository.NewsArticleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller for managing news articles and field reports.
 */
@RestController
@RequestMapping("/api/news")
@CrossOrigin(origins = "*")
public class NewsController {

    private final NewsArticleRepository newsRepo;

    public NewsController(NewsArticleRepository newsRepo) {
        this.newsRepo = newsRepo;
    }

    /**
     * GET /api/news
     * Returns all news articles (optional category filter).
     */
    @GetMapping
    public ResponseEntity<List<NewsArticle>> getAllNews(@RequestParam(required = false) String category) {
        if (category != null && !category.isBlank() && !"all".equalsIgnoreCase(category)) {
            return ResponseEntity.ok(newsRepo.findByCategoryOrderByCreatedAtDesc(category.toLowerCase()));
        }
        return ResponseEntity.ok(newsRepo.findAllByOrderByCreatedAtDesc());
    }

    /**
     * GET /api/news/featured
     * Returns featured news articles.
     */
    @GetMapping("/featured")
    public ResponseEntity<List<NewsArticle>> getFeatured() {
        return ResponseEntity.ok(newsRepo.findByFeaturedTrueOrderByCreatedAtDesc());
    }

    /**
     * GET /api/news/{id}
     * Returns a specific article.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getArticle(@PathVariable Long id) {
        return newsRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * POST /api/news
     * Creates and publishes a new article.
     */
    @PostMapping
    public ResponseEntity<?> createArticle(@Valid @RequestBody NewsArticle article) {
        if (article.getPublishDate() == null || article.getPublishDate().isBlank()) {
            article.setPublishDate(LocalDateTime.now().getMonth().name().substring(0, 3) + " " +
                    LocalDateTime.now().getDayOfMonth() + ", " + LocalDateTime.now().getYear());
        }
        article.setCreatedAt(LocalDateTime.now());
        article.setUpdatedAt(LocalDateTime.now());
        NewsArticle saved = newsRepo.save(article);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * PUT /api/news/{id}
     * Updates an existing news article.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateArticle(@PathVariable Long id, @RequestBody NewsArticle updated) {
        Optional<NewsArticle> existingOpt = newsRepo.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Article not found"));
        }

        NewsArticle article = existingOpt.get();
        if (updated.getTitle() != null) article.setTitle(updated.getTitle());
        if (updated.getCategory() != null) article.setCategory(updated.getCategory());
        if (updated.getPublishDate() != null) article.setPublishDate(updated.getPublishDate());
        if (updated.getReadTime() != null) article.setReadTime(updated.getReadTime());
        if (updated.getAuthor() != null) article.setAuthor(updated.getAuthor());
        if (updated.getExcerpt() != null) article.setExcerpt(updated.getExcerpt());
        if (updated.getContent() != null) article.setContent(updated.getContent());
        if (updated.getImageUrl() != null) article.setImageUrl(updated.getImageUrl());
        article.setFeatured(updated.isFeatured());
        article.setDisplayOrder(updated.getDisplayOrder());
        article.setUpdatedAt(LocalDateTime.now());

        NewsArticle saved = newsRepo.save(article);
        return ResponseEntity.ok(saved);
    }

    /**
     * DELETE /api/news/{id}
     * Deletes a news article.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteArticle(@PathVariable Long id) {
        if (!newsRepo.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Article not found"));
        }
        newsRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Article deleted successfully", "id", id));
    }
}

