package org.elevate.repository;

import org.elevate.model.NewsletterSubscriber;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NewsletterRepository extends JpaRepository<NewsletterSubscriber, Long> {
    List<NewsletterSubscriber> findAllByOrderBySubscribedAtDesc();
    boolean existsByEmail(String email);
}
