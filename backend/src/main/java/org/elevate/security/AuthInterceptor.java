package org.elevate.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.elevate.model.AuthSession;
import org.elevate.repository.AuthSessionRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;

/**
 * Interceptor to enforce security on content-editing and management API endpoints.
 * Only requests with a valid, non-expired Bearer token are authorized.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final AuthSessionRepository sessionRepo;

    public AuthInterceptor(AuthSessionRepository sessionRepo) {
        this.sessionRepo = sessionRepo;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Allow CORS preflight OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        String method = request.getMethod();

        // Check if the route requires authorization
        if (requiresAuthentication(path, method)) {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                sendUnauthorized(response, "Missing or invalid Authorization header");
                return false;
            }

            String token = authHeader.substring(7).trim();
            Optional<AuthSession> sessionOpt = sessionRepo.findByToken(token);
            if (sessionOpt.isEmpty() || sessionOpt.get().isExpired()) {
                sendUnauthorized(response, "Session has expired or is invalid. Please log in again.");
                return false;
            }

            // Set user attribute for downstream controllers
            request.setAttribute("currentUser", sessionOpt.get().getUsername());
            request.setAttribute("currentRole", sessionOpt.get().getRole());
        }

        return true;
    }

    private boolean requiresAuthentication(String path, String method) {
        // Auth verify endpoint requires token
        if (path.equals("/api/auth/verify")) {
            return true;
        }

        // All mutating methods (POST, PUT, DELETE, PATCH) on editing APIs require auth
        if ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) ||
            "DELETE".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method)) {

            if (path.startsWith("/api/content") ||
                path.startsWith("/api/news") ||
                path.startsWith("/api/announcements") ||
                path.startsWith("/api/events") ||
                path.startsWith("/api/gallery") ||
                path.startsWith("/api/uploads")) {
                return true;
            }
        }

        return false;
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws Exception {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(String.format("{\"error\": \"%s\", \"authenticated\": false}", message));
    }
}

