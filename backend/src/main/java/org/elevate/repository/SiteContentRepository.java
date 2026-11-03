package org.elevate.repository;

import org.elevate.model.SiteContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SiteContentRepository extends JpaRepository<SiteContent, Long> {
    Optional<SiteContent> findByContentKey(String contentKey);
    List<SiteContent> findByPage(String page);
    boolean existsByContentKey(String contentKey);
}

