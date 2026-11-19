package com.hirejob.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirejob.dto.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window rate limiter (per client IP) protecting against brute force,
 * credential stuffing, OTP guessing and request flooding.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final long WINDOW_MS = 60_000;

    private record Rule(String prefix, int limit) {}

    // Most specific prefixes first
    private static final Rule[] RULES = {
            new Rule("/api/auth/admin", 5),
            new Rule("/api/auth/forgot-password", 5),
            new Rule("/api/auth/otp", 10),
            new Rule("/api/auth/login", 10),
            new Rule("/api/auth/register", 8),
            new Rule("/api/auth/google", 10),
            new Rule("/api/auth", 60),
            new Rule("/api/", 300),
    };

    private static final class Window {
        volatile long start = System.currentTimeMillis();
        final AtomicInteger count = new AtomicInteger();
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI();
        Rule rule = null;
        for (Rule r : RULES) {
            if (path.startsWith(r.prefix())) { rule = r; break; }
        }
        if (rule == null || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String key = request.getRemoteAddr() + "|" + rule.prefix();
        Window w = windows.computeIfAbsent(key, k -> new Window());
        long now = System.currentTimeMillis();
        synchronized (w) {
            if (now - w.start > WINDOW_MS) {
                w.start = now;
                w.count.set(0);
            }
        }
        if (w.count.incrementAndGet() > rule.limit()) {
            long retryAfter = Math.max(1, (WINDOW_MS - (now - w.start)) / 1000);
            log.warn("[SECURITY] Rate limit exceeded: ip={} path={}", request.getRemoteAddr(), path);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            mapper.writeValue(response.getOutputStream(),
                    ApiResponse.error("Too many requests. Please wait " + retryAfter + " seconds and try again."));
            return;
        }
        chain.doFilter(request, response);
    }

    @Scheduled(fixedDelay = 300_000)
    public void purge() {
        long now = System.currentTimeMillis();
        windows.entrySet().removeIf(e -> now - e.getValue().start > WINDOW_MS * 2);
    }
}

