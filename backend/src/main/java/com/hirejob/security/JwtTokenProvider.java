package com.hirejob.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
    public static final String SCOPE_USER = "user";
    public static final String SCOPE_ADMIN = "admin";

    @Value("${app.jwt.secret:}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    @Value("${app.jwt.admin-expiration-ms:1800000}")
    private long adminExpirationMs;

    private SecretKey signingKey;

    @PostConstruct
    void init() {
        String secret = jwtSecret == null ? "" : jwtSecret.trim();
        if (secret.isEmpty()) {
            logger.warn("[SECURITY] app.jwt.secret not set - generating random ephemeral key");
            byte[] random = new byte[64];
            new java.security.SecureRandom().nextBytes(random);
            signingKey = Keys.hmacShaKeyFor(random);
            return;
        }
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (RuntimeException e) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 64) {
            keyBytes = sha512(keyBytes);
        }
        signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public long getExpirationMs(String scope) {
        return SCOPE_ADMIN.equals(scope) ? adminExpirationMs : jwtExpirationMs;
    }

    public String generateToken(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return generateTokenFromUserId(userDetails.getId());
    }

    public String generateTokenFromUserId(Long userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(Long.toString(userId))
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey)
                .compact();
    }

    public String generateToken(Long userId, String scope, int tokenVersion, String userAgent) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + getExpirationMs(scope));
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(Long.toString(userId))
                .claim("scope", scope)
                .claim("tv", tokenVersion)
                .claim("fp", fingerprint(userAgent))
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey)
                .compact();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return Long.parseLong(claims.getSubject());
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(authToken);
            return true;
        } catch (SecurityException | MalformedJwtException | ExpiredJwtException | UnsupportedJwtException
                | IllegalArgumentException ex) {
            logger.debug("Invalid JWT token: {}", ex.getMessage());
        }
        return false;
    }

    public Claims parse(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            logger.debug("Rejected session token: {}", ex.getClass().getSimpleName());
            return null;
        }
    }

    public static String fingerprint(String userAgent) {
        String ua = userAgent == null ? "" : userAgent;
        byte[] digest = sha256(ua.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest).substring(0, 22);
    }

    private static byte[] sha256(byte[] in) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(in);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] sha512(byte[] in) {
        try {
            return MessageDigest.getInstance("SHA-512").digest(in);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
