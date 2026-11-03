package org.elevate.controller;

import org.elevate.model.*;
import org.elevate.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * REST Controller — All public-facing API endpoints.
 * Handles contact messages, volunteer applications, donations, and newsletter subscriptions.
 * Data is persisted to SQLite via Spring Data JPA / Hibernate.
 *
 * Base URL: /api
 * CORS: All origins allowed (configure for production)
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ElevateController {

    private final ContactRepository contactRepo;
    private final VolunteerRepository volunteerRepo;
    private final DonationRepository donationRepo;
    private final NewsletterRepository newsletterRepo;

    public ElevateController(
        ContactRepository contactRepo,
        VolunteerRepository volunteerRepo,
        DonationRepository donationRepo,
        NewsletterRepository newsletterRepo
    ) {
        this.contactRepo    = contactRepo;
        this.volunteerRepo  = volunteerRepo;
        this.donationRepo   = donationRepo;
        this.newsletterRepo = newsletterRepo;
    }

    // ── Contact ──────────────────────────────────────────────

    /** POST /api/contact — Save a new contact form submission */
    @PostMapping("/contact")
    public ResponseEntity<Map<String,String>> saveContact(@Valid @RequestBody ContactMessage msg) {
        contactRepo.save(msg);
        return ResponseEntity.ok(Map.of("message", "Contact message received successfully."));
    }

    /** GET /api/contacts — Retrieve all contact messages (Admin use) */
    @GetMapping("/contacts")
    public ResponseEntity<List<ContactMessage>> getContacts() {
        return ResponseEntity.ok(contactRepo.findAllByOrderByCreatedAtDesc());
    }

    // ── Volunteer ────────────────────────────────────────────

    /** POST /api/volunteer — Submit a new volunteer application */
    @PostMapping("/volunteer")
    public ResponseEntity<Map<String,String>> saveVolunteer(@Valid @RequestBody VolunteerApplication app) {
        volunteerRepo.save(app);
        return ResponseEntity.ok(Map.of("message", "Volunteer application submitted successfully."));
    }

    /** GET /api/volunteers — Retrieve all volunteer applications (Admin use) */
    @GetMapping("/volunteers")
    public ResponseEntity<List<VolunteerApplication>> getVolunteers() {
        return ResponseEntity.ok(volunteerRepo.findAllByOrderByCreatedAtDesc());
    }

    // ── Donations ────────────────────────────────────────────

    /** POST /api/donate — Record a new donation */
    @PostMapping("/donate")
    public ResponseEntity<Map<String,String>> saveDonation(@Valid @RequestBody Donation donation) {
        donationRepo.save(donation);
        return ResponseEntity.ok(Map.of("message", "Donation recorded. Thank you for your generosity!"));
    }

    /** GET /api/donations — Retrieve all donations (Admin use) */
    @GetMapping("/donations")
    public ResponseEntity<List<Donation>> getDonations() {
        return ResponseEntity.ok(donationRepo.findAllByOrderByCreatedAtDesc());
    }

    /** GET /api/donations/total — Get total donations sum */
    @GetMapping("/donations/total")
    public ResponseEntity<Map<String,Double>> getDonationTotal() {
        Double total = donationRepo.sumAllAmounts();
        return ResponseEntity.ok(Map.of("total", total != null ? total : 0.0));
    }

    // ── Newsletter ───────────────────────────────────────────

    /** POST /api/newsletter — Subscribe an email to the newsletter */
    @PostMapping("/newsletter")
    public ResponseEntity<Map<String,String>> subscribe(@RequestBody Map<String,String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        if (newsletterRepo.existsByEmail(email)) {
            return ResponseEntity.ok(Map.of("message", "You are already subscribed!"));
        }
        NewsletterSubscriber sub = new NewsletterSubscriber();
        sub.setEmail(email);
        newsletterRepo.save(sub);
        return ResponseEntity.ok(Map.of("message", "Successfully subscribed to our newsletter!"));
    }

    /** GET /api/newsletter — Retrieve all subscribers (Admin use) */
    @GetMapping("/newsletter")
    public ResponseEntity<List<NewsletterSubscriber>> getSubscribers() {
        return ResponseEntity.ok(newsletterRepo.findAllByOrderBySubscribedAtDesc());
    }
}
