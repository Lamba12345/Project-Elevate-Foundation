package org.elevate.repository;

import org.elevate.model.SiteAnnouncement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<SiteAnnouncement, Long> {
    List<SiteAnnouncement> findByActiveTrueOrderByCreatedAtDesc();
    List<SiteAnnouncement> findAllByOrderByCreatedAtDesc();
}

