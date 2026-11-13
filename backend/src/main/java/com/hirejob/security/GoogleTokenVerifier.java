package com.hirejob.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirejob.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Verifies Google Identity Services ID tokens server-side. The browser never decides who the user
 * is - Google signs the token and we check signature (via Google), audience, issuer, expiry and
 * that the e-mail is verified.
 */
@Component
public class GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);

    public record GoogleUser(String sub, String email, String name, String picture) {}

    @Value("${app.google.client-id:}")
    private String clientId;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank();
    }

    public String getClientId() {
        return isConfigured() ? clientId.trim() : null;
    }

    public GoogleUser verify(String idToken) {
        if (!isConfigured()) {
            throw new BadRequestException("Google sign-in is not configured on this server.");
        }
        if (idToken == null || idToken.isBlank() || idToken.length() > 4096) {
            throw new BadRequestException("Invalid Google credential.");
        }
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" +
                            URLEncoder.encode(idToken, StandardCharsets.UTF_8)))
                    .timeout(Duration.ofSeconds(10))
                    .GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                throw new BadRequestException("Google credential could not be verified.");
            }
            JsonNode n = mapper.readTree(res.body());
            String aud = n.path("aud").asText();
            String iss = n.path("iss").asText();
            boolean emailVerified = "true".equalsIgnoreCase(n.path("email_verified").asText());
            long exp = n.path("exp").asLong(0);
            if (!clientId.trim().equals(aud)
                    || !(iss.equals("accounts.google.com") || iss.equals("https://accounts.google.com"))
                    || !emailVerified
                    || exp * 1000 < System.currentTimeMillis()) {
                throw new BadRequestException("Google credential could not be verified.");
            }
            return new GoogleUser(n.path("sub").asText(), n.path("email").asText().toLowerCase(),
                    n.path("name").asText(""), n.path("picture").asText(null));
        } catch (BadRequestException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Google verification was interrupted. Please try again.");
        } catch (Exception e) {
            log.warn("Google token verification failed: {}", e.getClass().getSimpleName());
            throw new BadRequestException("Google credential could not be verified.");
        }
    }
}

