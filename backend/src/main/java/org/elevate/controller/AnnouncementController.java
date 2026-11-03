package org.elevate.controller;

import jakarta.validation.Valid;
import org.elevate.model.SiteAnnouncement;
import org.elevate.repository.AnnouncementRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller for managing site announcements.
 */
@RestController
@RequestMapping("/api/announcements")
@CrossOrigin(origins = "*")
public class AnnouncementController {

    private final AnnouncementRepository announcementRepo;

    public AnnouncementController(AnnouncementRepository announcementRepo) {
        this.announcementRepo = announcementRepo;
    }

    /**
     * GET /api/announcements
     * Returns all active announcements for public visitors, or all when ?all=true.
     */
    @GetMapping
    public ResponseEntity<List<SiteAnnouncement>> getAnnouncements(@RequestParam(required = false, defaultValue = "false") boolean all) {
        if (all) {
            return ResponseEntity.ok(announcementRepo.findAllByOrderByCreatedAtDesc());
        }
        return ResponseEntity.ok(announcementRepo.findByActiveTrueOrderByCreatedAtDesc());
    }

    /**
     * POST /api/announcements
     * Publishes a new announcement.
     */
    @PostMapping
    public ResponseEntity<?> createAnnouncement(@Valid @RequestBody SiteAnnouncement announcement) {
        announcement.setCreatedAt(LocalDateTime.now());
        announcement.setUpdatedAt(LocalDateTime.now());
        SiteAnnouncement saved = announcementRepo.save(announcement);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * PUT /api/announcements/{id}
     * Updates an announcement.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAnnouncement(@PathVariable Long id, @RequestBody SiteAnnouncement updated) {
        Optional<SiteAnnouncement> existingOpt = announcementRepo.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Announcement not found"));
        }

        SiteAnnouncement a = existingOpt.get();
        if (updated.getTitle() != null) a.setTitle(updated.getTitle());
        if (updated.getMessage() != null) a.setMessage(updated.getMessage());
        if (updated.getBadge() != null) a.setBadge(updated.getBadge());
        if (updated.getLinkText() != null) a.setLinkText(updated.getLinkText());
        if (updated.getLinkUrl() != null) a.setLinkUrl(updated.getLinkUrl());
        if (updated.getType() != null) a.setType(updated.getType());
        a.setActive(updated.isActive());
        a.setUpdatedAt(LocalDateTime.now());

        SiteAnnouncement saved = announcementRepo.save(a);
        return ResponseEntity.ok(saved);
    }

    /**
     * DELETE /api/announcements/{id}
     * Deletes an announcement.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id) {
        if (!announcementRepo.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Announcement not found"));
        }
        announcementRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Announcement deleted successfully"));
    }
}

