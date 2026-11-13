package com.hirejob.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Optional network allow-list for the company admin portal (like a VPN / office-IP restriction).
 * Requests from other IPs receive a plain 404 so the admin surface is not even discoverable.
 */
public class AdminAccessFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AdminAccessFilter.class);
    private final Set<String> allowedIps;

    public AdminAccessFilter(String allowedIpsCsv) {
        this.allowedIps = allowedIpsCsv == null ? Set.of() : Arrays.stream(allowedIpsCsv.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return allowedIps.isEmpty() || !(path.startsWith("/api/admin") || path.startsWith("/api/auth/admin"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (!allowedIps.contains(request.getRemoteAddr())) {
            log.warn("[SECURITY] Admin portal access blocked for ip={} path={}", request.getRemoteAddr(), request.getRequestURI());
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        chain.doFilter(request, response);
    }
}

