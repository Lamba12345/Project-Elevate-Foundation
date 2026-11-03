package org.elevate.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.elevate.model.SiteContent;
import org.elevate.repository.SiteContentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Controller for managing inline-editable site content.
 * Public users can read content; authenticated editors can update content.
 */
@RestController
@RequestMapping("/api/content")
@CrossOrigin(origins = "*")
public class ContentController {

    private final SiteContentRepository contentRepo;

    public ContentController(SiteContentRepository contentRepo) {
        this.contentRepo = contentRepo;
    }

    /**
     * GET /api/content
     * Returns a dictionary of all content keys and their current values.
     * Optional ?page=home parameter to filter by page.
     */
    @GetMapping
    public ResponseEntity<Map<String, String>> getAllContent(@RequestParam(required = false) String page) {
        List<SiteContent> items = (page != null && !page.isBlank())
                ? contentRepo.findByPage(page)
                : contentRepo.findAll();

        Map<String, String> map = new HashMap<>();
        for (SiteContent item : items) {
            map.put(item.getContentKey(), item.getContentValue());
        }
        return ResponseEntity.ok(map);
    }

    /**
     * GET /api/content/details
     * Returns full metadata for all content items (last updated, updated by, content type).
     */
    @GetMapping("/details")
    public ResponseEntity<List<SiteContent>> getAllDetails() {
        return ResponseEntity.ok(contentRepo.findAll());
    }

    /**
     * GET /api/content/{key}
     * Returns a single content item by its key.
     */
    @GetMapping("/{key}")
    public ResponseEntity<?> getContentByKey(@PathVariable String key) {
        return contentRepo.findByContentKey(key)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * PUT /api/content/{key}
     * Updates or creates a single content item.
     */
    @PutMapping("/{key}")
    public ResponseEntity<?> updateContent(
            @PathVariable String key,
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        String value = body.get("value");
        if (value == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Content value is required."));
        }

        String page = body.getOrDefault("page", "global");
        String contentType = body.getOrDefault("contentType", "text");
        String label = body.get("label");
        Object userAttr = request.getAttribute("currentUser");
        final String author = (userAttr instanceof String && !((String) userAttr).isBlank())
                ? (String) userAttr : "editor";

        SiteContent item = contentRepo.findByContentKey(key)
                .orElseGet(() -> new SiteContent(key, page, contentType, value, label, author));

        item.setContentValue(value);
        if (label != null) item.setLabel(label);
        if (page != null) item.setPage(page);
        if (contentType != null) item.setContentType(contentType);
        item.setLastUpdated(LocalDateTime.now());
        item.setUpdatedBy(author);

        contentRepo.save(item);
        return ResponseEntity.ok(item);
    }

    /**
     * PUT /api/content/batch
     * Updates multiple content items in a single request.
     * Supports either:
     * 1) A map of { "key": "value", ... }
     * 2) Or { "items": { "key": "value", ... } }
     */
    @PutMapping("/batch")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> batchUpdateContent(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request
    ) {
        Object userAttr = request.getAttribute("currentUser");
        final String author = (userAttr instanceof String && !((String) userAttr).isBlank())
                ? (String) userAttr : "editor";

        Map<String, String> itemsToUpdate = new HashMap<>();

        if (payload.containsKey("items") && payload.get("items") instanceof Map) {
            Map<?, ?> raw = (Map<?, ?>) payload.get("items");
            for (Map.Entry<?, ?> entry : raw.entrySet()) {
                if (entry.getKey() != null && entry.getValue() != null) {
                    itemsToUpdate.put(entry.getKey().toString(), entry.getValue().toString());
                }
            }
        } else {
            for (Map.Entry<String, Object> entry : payload.entrySet()) {
                if (entry.getValue() instanceof String) {
                    itemsToUpdate.put(entry.getKey(), (String) entry.getValue());
                }
            }
        }

        int updatedCount = 0;
        for (Map.Entry<String, String> entry : itemsToUpdate.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();

            SiteContent content = contentRepo.findByContentKey(key)
                    .orElseGet(() -> {
                        String page = key.contains(".") ? key.split("\\.")[0] : "global";
                        return new SiteContent(key, page, "text", value, key, author);
                    });

            content.setContentValue(value);
            content.setLastUpdated(LocalDateTime.now());
            content.setUpdatedBy(author);
            contentRepo.save(content);
            updatedCount++;
        }

        return ResponseEntity.ok(Map.of(
                "message", "Successfully saved " + updatedCount + " content item(s).",
                "count", updatedCount
        ));
    }

    /**
     * DELETE /api/content/{key}
     * Deletes a custom content key.
     */
    @DeleteMapping("/{key}")
    public ResponseEntity<?> deleteContent(@PathVariable String key) {
        Optional<SiteContent> item = contentRepo.findByContentKey(key);
        if (item.isPresent()) {
            contentRepo.delete(item.get());
            return ResponseEntity.ok(Map.of("message", "Content key '" + key + "' deleted."));
        }
        return ResponseEntity.notFound().build();
    }
}
