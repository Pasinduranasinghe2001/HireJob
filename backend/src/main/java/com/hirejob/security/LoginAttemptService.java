package com.hirejob.security;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Locks an account for 15 minutes after 5 consecutive failed password attempts (brute-force defence). */
@Service
public class LoginAttemptService {

    private static final int MAX_FAILURES = 5;
    private static final long LOCK_MS = 15 * 60_000L;

    private record State(int failures, long lockedUntil) {}

    private final Map<String, State> states = new ConcurrentHashMap<>();

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    public long lockedForSeconds(String email) {
        State s = states.get(key(email));
        if (s == null) return 0;
        long left = s.lockedUntil() - System.currentTimeMillis();
        return left > 0 ? (left + 999) / 1000 : 0;
    }

    public void recordFailure(String email) {
        states.compute(key(email), (k, s) -> {
            int failures = (s == null || s.lockedUntil() < System.currentTimeMillis() && s.lockedUntil() != 0) ? 1 : s.failures() + 1;
            long lockedUntil = failures >= MAX_FAILURES ? System.currentTimeMillis() + LOCK_MS : 0;
            return new State(failures, lockedUntil);
        });
    }

    public void recordSuccess(String email) {
        states.remove(key(email));
    }

    @Scheduled(fixedDelay = 600_000)
    public void purge() {
        long now = System.currentTimeMillis();
        states.entrySet().removeIf(e -> e.getValue().lockedUntil() != 0 && e.getValue().lockedUntil() < now);
    }
}

