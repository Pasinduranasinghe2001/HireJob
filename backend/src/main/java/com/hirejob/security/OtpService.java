package com.hirejob.security;

import com.hirejob.exception.BadRequestException;
import lombok.Getter;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * One-time-password challenges (e-mail verification, login verification, 2FA, admin login).
 * <ul>
 *   <li>Each challenge has an unguessable id bound to the user + purpose (prevents OTP reuse across flows)</li>
 *   <li>Codes are stored only as salted SHA-256 hashes and compared in constant time</li>
 *   <li>5 minute validity, max 5 wrong attempts, 60 second resend cooldown, max 5 resends</li>
 * </ul>
 */
@Service
public class OtpService {

    public static final long VALIDITY_MS = 5 * 60_000L;
    public static final long RESEND_COOLDOWN_MS = 60_000L;
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_RESENDS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    public enum Purpose { EMAIL_VERIFY, LOGIN, ADMIN_LOGIN }

    @Getter
    public static final class Challenge {
        private final String id;
        private final Long userId;
        private final String email;
        private final Purpose purpose;
        private String codeHash;
        private String salt;
        private long createdAt;
        private long lastSentAt;
        private int attempts;
        private int resends;

        private Challenge(String id, Long userId, String email, Purpose purpose) {
            this.id = id;
            this.userId = userId;
            this.email = email;
            this.purpose = purpose;
        }

        public long remainingSeconds() {
            return Math.max(0, (VALIDITY_MS - (System.currentTimeMillis() - createdAt)) / 1000);
        }

        public long resendAvailableInSeconds() {
            return Math.max(0, (RESEND_COOLDOWN_MS - (System.currentTimeMillis() - lastSentAt) + 999) / 1000);
        }

        boolean isExpired() {
            return System.currentTimeMillis() - createdAt > VALIDITY_MS;
        }
    }

    private final Map<String, Challenge> challenges = new ConcurrentHashMap<>();

    /** Creates a new challenge and returns the plain code (to be delivered out-of-band only). */
    public String[] create(Long userId, String email, Purpose purpose) {
        // Only one live challenge per user + purpose
        challenges.values().removeIf(c -> c.userId.equals(userId) && c.purpose == purpose);
        byte[] idBytes = new byte[24];
        RANDOM.nextBytes(idBytes);
        String id = Base64.getUrlEncoder().withoutPadding().encodeToString(idBytes);
        Challenge c = new Challenge(id, userId, email, purpose);
        String code = setNewCode(c);
        challenges.put(id, c);
        return new String[]{id, code};
    }

    public Challenge get(String challengeId) {
        Challenge c = challengeId == null ? null : challenges.get(challengeId);
        if (c == null) {
            throw new BadRequestException("This verification session has expired. Please sign in again.");
        }
        return c;
    }

    /** Issues a fresh code for an existing challenge (resend), enforcing cooldown. */
    public String resend(String challengeId) {
        Challenge c = get(challengeId);
        synchronized (c) {
            if (c.resendAvailableInSeconds() > 0) {
                throw new BadRequestException("Please wait " + c.resendAvailableInSeconds() + " seconds before requesting a new code.");
            }
            if (c.resends >= MAX_RESENDS) {
                challenges.remove(challengeId);
                throw new BadRequestException("Too many resend requests. Please start again.");
            }
            c.resends++;
            return setNewCode(c);
        }
    }

    /** Verifies and consumes the challenge. Throws on failure. */
    public Challenge verify(String challengeId, String code) {
        Challenge c = get(challengeId);
        synchronized (c) {
            if (c.isExpired()) {
                throw new BadRequestException("Verification code has expired. Please click Resend Code.");
            }
            if (c.attempts >= MAX_ATTEMPTS) {
                challenges.remove(challengeId);
                throw new BadRequestException("Too many incorrect attempts. Please sign in again.");
            }
            String candidate = code == null ? "" : code.trim();
            if (!candidate.matches("\\d{6}") ||
                    !MessageDigest.isEqual(hash(c.salt, candidate).getBytes(StandardCharsets.UTF_8),
                            c.codeHash.getBytes(StandardCharsets.UTF_8))) {
                c.attempts++;
                int left = MAX_ATTEMPTS - c.attempts;
                if (left <= 0) {
                    challenges.remove(challengeId);
                    throw new BadRequestException("Too many incorrect attempts. Please sign in again.");
                }
                throw new BadRequestException("Invalid verification code. " + left + " attempt(s) left.");
            }
            challenges.remove(challengeId);
            return c;
        }
    }

    private String setNewCode(Challenge c) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        byte[] saltBytes = new byte[16];
        RANDOM.nextBytes(saltBytes);
        c.salt = HexFormat.of().formatHex(saltBytes);
        c.codeHash = hash(c.salt, code);
        c.createdAt = System.currentTimeMillis();
        c.lastSentAt = c.createdAt;
        c.attempts = 0;
        return code;
    }

    private static String hash(String salt, String code) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest((salt + ":" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Scheduled(fixedDelay = 120_000)
    public void purgeExpired() {
        long cutoff = System.currentTimeMillis() - VALIDITY_MS * 3;
        challenges.values().removeIf(c -> c.createdAt < cutoff);
    }
}

