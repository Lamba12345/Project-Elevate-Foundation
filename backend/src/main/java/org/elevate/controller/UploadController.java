package org.elevate.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.elevate.model.UploadedFile;
import org.elevate.repository.UploadedFileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

/**
 * Controller for handling image uploads.
 * Validates file types and sizes, stores them in persistent file storage,
 * and records metadata in the database.
 */
@RestController
@RequestMapping("/api/uploads")
@CrossOrigin(origins = "*")
public class UploadController {

    private final UploadedFileRepository uploadRepo;

    @Value("${elevate.upload.dir:uploads}")
    private String uploadDir;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "gif", "svg"
    );

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"
    );

    public UploadController(UploadedFileRepository uploadRepo) {
        this.uploadRepo = uploadRepo;
    }

    /**
     * POST /api/uploads
     * Accepts a single image file upload and returns its persistent public URL.
     */
    @PostMapping
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request
    ) {
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "No file was uploaded."));
        }

        String originalFilename = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.jpg"
        );

        // Security check: reject path traversal
        if (originalFilename.contains("..")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid filename sequence."));
        }

        // Validate extension
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex + 1).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid file extension. Only JPG, PNG, WEBP, GIF, and SVG images are allowed."));
        }

        // Validate content type
        String contentType = file.getContentType();
        if (contentType == null || (!ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase()) && !contentType.startsWith("image/"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid file content type. Must be a valid image."));
        }

        // Size limit check (15MB)
        if (file.getSize() > 15 * 1024 * 1024) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "File size exceeds 15MB limit."));
        }

        try {
            // Ensure target directory exists
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Create clean unique filename
            String baseName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
            String storedFilename = UUID.randomUUID().toString().substring(0, 8) + "_" + System.currentTimeMillis() + "_" + baseName;

            Path targetLocation = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            String publicUrl = "/uploads/" + storedFilename;
            String currentUser = (String) request.getAttribute("currentUser");
            if (currentUser == null) currentUser = "editor";

            // Save record to database
            UploadedFile record = new UploadedFile(
                    originalFilename,
                    storedFilename,
                    publicUrl,
                    contentType,
                    file.getSize(),
                    currentUser
            );
            uploadRepo.save(record);

            return ResponseEntity.ok(Map.of(
                    "url", publicUrl,
                    "filename", storedFilename,
                    "originalName", originalFilename,
                    "size", file.getSize(),
                    "contentType", contentType
            ));

        } catch (IOException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to store file: " + ex.getMessage()));
        }
    }

    /**
     * GET /api/uploads/list
     * Returns list of recently uploaded files.
     */
    @GetMapping("/list")
    public ResponseEntity<List<UploadedFile>> listUploads() {
        return ResponseEntity.ok(uploadRepo.findAllByOrderByUploadedAtDesc());
    }
}

