package org.elevate.repository;

import org.elevate.model.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface DonationRepository extends JpaRepository<Donation, Long> {
    List<Donation> findAllByOrderByCreatedAtDesc();

    @Query("SELECT SUM(d.amount) FROM Donation d")
    Double sumAllAmounts();
}
