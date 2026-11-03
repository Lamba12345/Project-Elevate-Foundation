package org.elevate.repository;

import org.elevate.model.NewsArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {
    List<NewsArticle> findAllByOrderByCreatedAtDesc();
    List<NewsArticle> findByCategoryOrderByCreatedAtDesc(String category);
    List<NewsArticle> findByFeaturedTrueOrderByCreatedAtDesc();
}

