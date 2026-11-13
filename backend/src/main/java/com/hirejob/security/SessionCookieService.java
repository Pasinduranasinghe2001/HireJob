package com.hirejob.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stores the session token in an HttpOnly + SameSite=Strict (+ Secure in production) cookie.
 * JavaScript can never read it, which blocks token theft through XSS and cross-site requests.
 * Logged-out token ids are kept in a deny-list until they expire.
 */
@Component
public class SessionCookieService {

    public static final String COOKIE_NAME = "HJ_SESSION";

    @Value("${app.security.cookie-secure:false}")
    private boolean secure;

    private final Map<String, Long> revokedTokenIds = new ConcurrentHashMap<>();

    public void writeSessionCookie(HttpServletResponse response, String token, long maxAgeMs) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/api")
                .maxAge(Duration.ofMillis(maxAgeMs))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearSessionCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/api")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public String readToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (COOKIE_NAME.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                return c.getValue();
            }
        }
        return null;
    }

    public void revoke(String jti, long expiresAtMs) {
        if (jti != null) revokedTokenIds.put(jti, expiresAtMs);
    }

    public boolean isRevoked(String jti) {
        return jti != null && revokedTokenIds.containsKey(jti);
    }

    @Scheduled(fixedDelay = 600_000)
    public void purgeExpired() {
        long now = System.currentTimeMillis();
        revokedTokenIds.entrySet().removeIf(e -> e.getValue() < now);
    }
}

