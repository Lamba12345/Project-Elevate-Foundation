package org.elevate.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.elevate.model.AuthSession;
import org.elevate.model.User;
import org.elevate.repository.AuthSessionRepository;
import org.elevate.repository.UserRepository;
import org.elevate.security.SecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Controller for editor authentication.
 * Uses BCrypt for password verification and creates secure auth session tokens.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepo;
    private final AuthSessionRepository sessionRepo;
    private final SecurityUtils securityUtils;

    public AuthController(UserRepository userRepo, AuthSessionRepository sessionRepo, SecurityUtils securityUtils) {
        this.userRepo = userRepo;
        this.sessionRepo = sessionRepo;
        this.securityUtils = securityUtils;
    }

    /**
     * POST /api/auth/login
     * Authenticates an editor with username and password.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Username and password are required."));
        }

        Optional<User> userOpt = userRepo.findByUsername(username.trim().toLowerCase());
        if (userOpt.isEmpty() || !userOpt.get().isActive()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password."));
        }

        User user = userOpt.get();
        if (!securityUtils.checkPassword(password, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password."));
        }

        // Generate secure 256-bit session token valid for 7 days
        String token = securityUtils.generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);

        AuthSession session = new AuthSession(token, user.getUsername(), user.getRole(), expiresAt);
        sessionRepo.save(session);

        return ResponseEntity.ok(Map.of(
                "token", token,
                "username", user.getUsername(),
                "fullName", user.getFullName() != null ? user.getFullName() : user.getUsername(),
                "role", user.getRole(),
                "expiresAt", expiresAt.toString()
        ));
    }

    /**
     * GET /api/auth/verify
     * Checks if current Bearer token is valid and returns user info.
     */
    @GetMapping("/verify")
    public ResponseEntity<?> verify(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("authenticated", false, "error", "No token provided"));
        }

        String token = authHeader.substring(7).trim();
        Optional<AuthSession> sessionOpt = sessionRepo.findByToken(token);

        if (sessionOpt.isEmpty() || sessionOpt.get().isExpired()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("authenticated", false, "error", "Token expired or invalid"));
        }

        AuthSession session = sessionOpt.get();
        Optional<User> userOpt = userRepo.findByUsername(session.getUsername());

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "username", session.getUsername(),
                "role", session.getRole(),
                "fullName", userOpt.map(User::getFullName).orElse(session.getUsername()),
                "expiresAt", session.getExpiresAt().toString()
        ));
    }

    /**
     * POST /api/auth/logout
     * Revokes active session token.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            sessionRepo.deleteByToken(token);
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}

