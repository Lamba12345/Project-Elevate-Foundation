package org.elevate.repository;

import org.elevate.model.UploadedFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {
    Optional<UploadedFile> findByStoredFilename(String storedFilename);
    List<UploadedFile> findAllByOrderByUploadedAtDesc();
}

