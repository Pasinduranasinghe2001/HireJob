package com.hirejob.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

/** Optional mobile OTP delivery through Twilio (configure TWILIO_* in backend/.env). */
@Service
@Slf4j
public class SmsService {

    @Value("${app.sms.twilio-account-sid:}")
    private String accountSid;
    @Value("${app.sms.twilio-auth-token:}")
    private String authToken;
    @Value("${app.sms.twilio-from-number:}")
    private String fromNumber;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();

    public boolean isConfigured() {
        return !accountSid.isBlank() && !authToken.isBlank() && !fromNumber.isBlank();
    }

    /** Converts local Sri Lankan numbers (07XXXXXXXX) to E.164 (+947XXXXXXXX). */
    static String toE164(String phone) {
        String digits = phone.replaceAll("[^0-9+]", "");
        if (digits.startsWith("+")) return digits;
        if (digits.startsWith("0") && digits.length() == 10) return "+94" + digits.substring(1);
        if (digits.startsWith("94")) return "+" + digits;
        return digits;
    }

    public boolean sendOtp(String phone, String code) {
        if (!isConfigured() || phone == null || phone.isBlank()) return false;
        try {
            String body = "To=" + URLEncoder.encode(toE164(phone), StandardCharsets.UTF_8)
                    + "&From=" + URLEncoder.encode(fromNumber, StandardCharsets.UTF_8)
                    + "&Body=" + URLEncoder.encode("HireJob verification code: " + code + " (valid 5 min). Never share it.", StandardCharsets.UTF_8);
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.twilio.com/2010-04-01/Accounts/" + URLEncoder.encode(accountSid, StandardCharsets.UTF_8) + "/Messages.json"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Basic " + Base64.getEncoder().encodeToString((accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8)))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            boolean ok = res.statusCode() >= 200 && res.statusCode() < 300;
            if (!ok) log.warn("[SMS] Twilio returned HTTP {}", res.statusCode());
            return ok;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.warn("[SMS] Failed to send OTP SMS: {}", e.getClass().getSimpleName());
            return false;
        }
    }
}

