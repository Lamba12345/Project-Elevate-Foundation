package org.elevate.repository;

import org.elevate.model.VolunteerApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VolunteerRepository extends JpaRepository<VolunteerApplication, Long> {
    List<VolunteerApplication> findAllByOrderByCreatedAtDesc();
}
