package org.elevate.repository;

import org.elevate.model.SiteEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SiteEventRepository extends JpaRepository<SiteEvent, Long> {
    List<SiteEvent> findAllByOrderByCreatedAtDesc();
}

