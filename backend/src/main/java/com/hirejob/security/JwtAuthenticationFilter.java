package com.hirejob.security;

import com.hirejob.model.entity.User;
import com.hirejob.model.enums.Role;
import com.hirejob.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Objects;

/**
 * Authenticates requests from the HttpOnly session cookie.
 * A token is accepted only when: signature valid, not expired, not revoked (logout),
 * token-version matches the user (password change / forced logout), the browser
 * fingerprint matches, and admin accounts present an admin-portal scoped token.
 */
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtTokenProvider tokenProvider;
    private final SessionCookieService cookieService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String jwt = resolveJwtFromRequest(request);
        if (jwt != null) {
            try {
                Claims claims = tokenProvider.parse(jwt);
                if (claims != null && !cookieService.isRevoked(claims.getId())) {
                    Long userId = Long.parseLong(claims.getSubject());
                    User user = userRepository.findById(userId).orElse(null);
                    if (user != null && !Boolean.FALSE.equals(user.getActive()) && isTokenAcceptable(claims, user, request)) {
                        CustomUserDetails details = CustomUserDetails.create(user);
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        request.setAttribute("hj.jti", claims.getId());
                        if (claims.getExpiration() != null) {
                            request.setAttribute("hj.exp", claims.getExpiration().getTime());
                        }
                    } else {
                        cookieService.clearSessionCookie(response);
                    }
                }
            } catch (Exception ex) {
                log.debug("Session authentication failed: {}", ex.getClass().getSimpleName());
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    private String resolveJwtFromRequest(HttpServletRequest request) {
        String cookieToken = cookieService.readToken(request);
        if (cookieToken != null && !cookieToken.isBlank()) {
            return cookieToken;
        }
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            String headerToken = bearer.substring(7).trim();
            if (!headerToken.isBlank()) {
                return headerToken;
            }
        }
        return null;
    }

    private boolean isTokenAcceptable(Claims claims, User user, HttpServletRequest request) {
        int tokenVersion = claims.get("tv", Integer.class) == null ? 0 : claims.get("tv", Integer.class);
        int userVersion = user.getTokenVersion() == null ? 0 : user.getTokenVersion();
        if (tokenVersion != userVersion) return false;

        String fp = claims.get("fp", String.class);
        if (fp != null && !Objects.equals(fp, JwtTokenProvider.fingerprint(request.getHeader("User-Agent")))) {
            log.warn("[SECURITY] Session token presented from a different browser fingerprint for user {} - rejected", user.getId());
            return false;
        }

        String scope = claims.get("scope", String.class);
        if (scope != null) {
            boolean isAdmin = user.getRole() == Role.ROLE_ADMIN;
            // Admin accounts are only valid with an admin-portal token, and admin tokens only for admins.
            return isAdmin == JwtTokenProvider.SCOPE_ADMIN.equals(scope);
        }
        return true;
    }
}
