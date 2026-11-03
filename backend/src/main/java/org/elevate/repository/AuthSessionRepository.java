package org.elevate.repository;

import org.elevate.model.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {
    Optional<AuthSession> findByToken(String token);

    @Transactional
    void deleteByToken(String token);

    @Transactional
    @Modifying
    @Query("DELETE FROM AuthSession s WHERE s.expiresAt < :now")
    void deleteExpiredSessions(LocalDateTime now);
}

