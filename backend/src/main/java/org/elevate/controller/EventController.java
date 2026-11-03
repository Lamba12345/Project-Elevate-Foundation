package org.elevate.controller;

import jakarta.validation.Valid;
import org.elevate.model.SiteEvent;
import org.elevate.repository.SiteEventRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller for managing events.
 */
@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class EventController {

    private final SiteEventRepository eventRepo;

    public EventController(SiteEventRepository eventRepo) {
        this.eventRepo = eventRepo;
    }

    /**
     * GET /api/events
     * Returns all events.
     */
    @GetMapping
    public ResponseEntity<List<SiteEvent>> getAllEvents() {
        return ResponseEntity.ok(eventRepo.findAllByOrderByCreatedAtDesc());
    }

    /**
     * POST /api/events
     * Adds an upcoming event.
     */
    @PostMapping
    public ResponseEntity<?> createEvent(@Valid @RequestBody SiteEvent event) {
        event.setCreatedAt(LocalDateTime.now());
        SiteEvent saved = eventRepo.save(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * PUT /api/events/{id}
     * Updates an event.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable Long id, @RequestBody SiteEvent updated) {
        Optional<SiteEvent> existingOpt = eventRepo.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Event not found"));
        }

        SiteEvent event = existingOpt.get();
        if (updated.getTitle() != null) event.setTitle(updated.getTitle());
        if (updated.getEventDate() != null) event.setEventDate(updated.getEventDate());
        if (updated.getEventTime() != null) event.setEventTime(updated.getEventTime());
        if (updated.getLocation() != null) event.setLocation(updated.getLocation());
        if (updated.getDescription() != null) event.setDescription(updated.getDescription());
        if (updated.getCategory() != null) event.setCategory(updated.getCategory());
        if (updated.getRegisterUrl() != null) event.setRegisterUrl(updated.getRegisterUrl());
        if (updated.getStatus() != null) event.setStatus(updated.getStatus());

        SiteEvent saved = eventRepo.save(event);
        return ResponseEntity.ok(saved);
    }

    /**
     * DELETE /api/events/{id}
     * Deletes an event.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        if (!eventRepo.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Event not found"));
        }
        eventRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Event deleted successfully"));
    }
}

