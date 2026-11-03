package org.elevate.controller;

import jakarta.validation.Valid;
import org.elevate.model.GalleryItem;
import org.elevate.repository.GalleryItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller for managing the community photo gallery.
 */
@RestController
@RequestMapping("/api/gallery")
@CrossOrigin(origins = "*")
public class GalleryController {

    private final GalleryItemRepository galleryRepo;

    public GalleryController(GalleryItemRepository galleryRepo) {
        this.galleryRepo = galleryRepo;
    }

    /**
     * GET /api/gallery
     * Returns all gallery items.
     */
    @GetMapping
    public ResponseEntity<List<GalleryItem>> getAllGalleryItems(@RequestParam(required = false) String category) {
        if (category != null && !category.isBlank() && !"all".equalsIgnoreCase(category)) {
            return ResponseEntity.ok(galleryRepo.findByCategoryOrderByDisplayOrderAsc(category.toLowerCase()));
        }
        return ResponseEntity.ok(galleryRepo.findAllByOrderByDisplayOrderAscCreatedAtDesc());
    }

    /**
     * POST /api/gallery
     * Adds an image to the gallery.
     */
    @PostMapping
    public ResponseEntity<?> addGalleryItem(@Valid @RequestBody GalleryItem item) {
        item.setCreatedAt(LocalDateTime.now());
        GalleryItem saved = galleryRepo.save(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * PUT /api/gallery/{id}
     * Updates an image caption, title, or order.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateGalleryItem(@PathVariable Long id, @RequestBody GalleryItem updated) {
        Optional<GalleryItem> existingOpt = galleryRepo.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Gallery item not found"));
        }

        GalleryItem item = existingOpt.get();
        if (updated.getTitle() != null) item.setTitle(updated.getTitle());
        if (updated.getCaption() != null) item.setCaption(updated.getCaption());
        if (updated.getImageUrl() != null) item.setImageUrl(updated.getImageUrl());
        if (updated.getCategory() != null) item.setCategory(updated.getCategory());
        item.setDisplayOrder(updated.getDisplayOrder());

        GalleryItem saved = galleryRepo.save(item);
        return ResponseEntity.ok(saved);
    }

    /**
     * DELETE /api/gallery/{id}
     * Deletes an image from the gallery.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteGalleryItem(@PathVariable Long id) {
        if (!galleryRepo.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Gallery item not found"));
        }
        galleryRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Gallery item deleted successfully"));
    }
}

