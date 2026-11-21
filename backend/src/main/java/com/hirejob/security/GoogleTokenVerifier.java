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
 * Verifies Google Identity Services ID tokens and OAuth2 access tokens server-side.
 * The browser never decides who the user is - Google validates the token and audience,
 * and email ownership is verified before returning the GoogleUser identity.
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

    public GoogleUser verify(String token) {
        if (!isConfigured()) {
            throw new BadRequestException("Google sign-in is not configured on this server.");
        }
        if (token == null || token.isBlank() || token.length() > 4096) {
            throw new BadRequestException("Invalid Google credential.");
        }
        String trimmed = token.trim();
        boolean isJwtIdToken = trimmed.chars().filter(ch -> ch == '.').count() == 2;
        try {
            return isJwtIdToken ? verifyIdToken(trimmed) : verifyAccessToken(trimmed);
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

    private GoogleUser verifyIdToken(String idToken) throws Exception {
        JsonNode n = getJson("https://oauth2.googleapis.com/tokeninfo?id_token="
                + URLEncoder.encode(idToken, StandardCharsets.UTF_8), null);
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
        return new GoogleUser(
                n.path("sub").asText(),
                n.path("email").asText().toLowerCase(),
                n.path("name").asText(""),
                n.path("picture").asText(null));
    }

    private GoogleUser verifyAccessToken(String accessToken) throws Exception {
        JsonNode tokenInfo = getJson("https://oauth2.googleapis.com/tokeninfo?access_token="
                + URLEncoder.encode(accessToken, StandardCharsets.UTF_8), null);
        String aud = tokenInfo.path("aud").asText();
        String azp = tokenInfo.path("azp").asText();
        long exp = tokenInfo.path("exp").asLong(0);
        String expected = clientId.trim();
        if ((!expected.equals(aud) && !expected.equals(azp))
                || exp * 1000 < System.currentTimeMillis()) {
            throw new BadRequestException("Google access token audience mismatch or expired.");
        }

        JsonNode userInfo = getJson("https://www.googleapis.com/oauth2/v3/userinfo", accessToken);
        if (!userInfo.path("email_verified").asBoolean(false)) {
            throw new BadRequestException("Google email is not verified.");
        }
        return new GoogleUser(
                userInfo.path("sub").asText(),
                userInfo.path("email").asText().toLowerCase(),
                userInfo.path("name").asText(""),
                userInfo.path("picture").asText(null));
    }

    private JsonNode getJson(String uri, String bearerToken) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(uri))
                .timeout(Duration.ofSeconds(10))
                .GET();
        if (bearerToken != null) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }
        HttpResponse<String> res = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) {
            throw new BadRequestException("Google credential could not be verified.");
        }
        return mapper.readTree(res.body());
    }
}
