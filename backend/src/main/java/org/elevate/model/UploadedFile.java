package org.elevate.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity: UploadedFile
 * Records metadata for all files uploaded via the inline image editor.
 * Table: uploaded_files
 */
@Entity
@Table(name = "uploaded_files")
@Data
@NoArgsConstructor
public class UploadedFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String originalFilename;

    @Column(nullable = false, unique = true)
    private String storedFilename;

    @Column(nullable = false)
    private String fileUrl;

    private String contentType;

    private Long fileSize;

    private String uploadedBy;

    private LocalDateTime uploadedAt = LocalDateTime.now();

    public UploadedFile(String originalFilename, String storedFilename, String fileUrl, String contentType, Long fileSize, String uploadedBy) {
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.fileUrl = fileUrl;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.uploadedBy = uploadedBy;
        this.uploadedAt = LocalDateTime.now();
    }
}

