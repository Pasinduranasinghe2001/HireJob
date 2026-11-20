package com.hirejob.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Sends OTP verification and password-reset e-mails.
 * Supports HTTPS APIs (Brevo, Resend, or a Google Apps Script Gmail webhook) over port 443
 * (required on cloud hosts like Render Free Tier that block outbound SMTP ports 25/465/587),
 * with Gmail SMTP (JavaMailSender) as automatic fallback for local dev or paid tiers.
 */
@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    @Value("${app.email.brevo-api-key:}")
    private String brevoApiKey;

    @Value("${app.email.resend-api-key:}")
    private String resendApiKey;

    @Value("${app.email.webhook-url:}")
    private String webhookUrl;

    @Value("${app.email.from-email:pasinduworkwebsite@gmail.com}")
    private String fromEmail;

    @Value("${app.email.from-name:HireJob Sri Lanka}")
    private String fromName;

    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(8))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    private boolean isHttpsProviderConfigured() {
        return !brevoApiKey.isBlank() || !resendApiKey.isBlank() || !webhookUrl.isBlank();
    }

    private boolean isSmtpConfigured() {
        return mailSender != null
                && smtpUsername != null && !smtpUsername.isBlank()
                && smtpPassword != null && !smtpPassword.isBlank()
                && !smtpUsername.startsWith("your.address");
    }

    public boolean isConfigured() {
        return isHttpsProviderConfigured() || isSmtpConfigured();
    }

    public String getActiveProvider() {
        if (!brevoApiKey.isBlank()) return "BREVO_HTTPS";
        if (!resendApiKey.isBlank()) return "RESEND_HTTPS";
        if (!webhookUrl.isBlank()) return "GMAIL_WEBHOOK_HTTPS";
        if (isSmtpConfigured()) return "GMAIL_SMTP";
        return "NONE";
    }

    /**
     * @return true when the e-mail was handed to a configured mail transport successfully.
     */
    public boolean sendOtp(String toEmail, String code, String purposeLabel) {
        String subject = "HireJob " + purposeLabel + " code: " + code;
        String plainText = "Your HireJob verification code is " + code + " (valid for 2 minutes).";
        String htmlContent = buildOtpHtml(code, purposeLabel);

        // 1. HTTPS APIs first (work reliably on Render Free Tier where port 587 is blocked)
        if (!brevoApiKey.isBlank() && sendViaBrevo(toEmail, subject, htmlContent, plainText)) {
            return true;
        }
        if (!resendApiKey.isBlank() && sendViaResend(toEmail, subject, htmlContent, plainText)) {
            return true;
        }
        if (!webhookUrl.isBlank() && sendViaWebhook(toEmail, subject, htmlContent, plainText)) {
            return true;
        }

        // 2. Fall back to SMTP (local development / paid cloud tiers)
        if (isSmtpConfigured()) {
            return sendViaSmtp(toEmail, subject, htmlContent, plainText, purposeLabel);
        }

        if (!isConfigured()) {
            log.warn("[EMAIL] No email transport configured. DEV ONLY - {} code for {}: {}", purposeLabel, toEmail, code);
        }
        return false;
    }

    private String buildOtpHtml(String code, String purposeLabel) {
        return """
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;">
              <h2 style="color:#2563eb;margin:0 0 4px 0;font-size:22px;text-align:center;">HireJob Sri Lanka</h2>
              <p style="color:#6b7280;font-size:13px;margin:0 0 20px 0;text-align:center;">%s</p>
              <div style="background:#f8fafc;border-radius:12px;padding:20px;text-align:center;">
                <p style="color:#374151;font-size:14px;margin:0 0 12px 0;">Your one-time verification code is:</p>
                <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1e40af;font-family:monospace;padding:10px 16px;background:#e0e7ff;border-radius:8px;display:inline-block;">%s</div>
                <p style="color:#dc2626;font-size:12px;font-weight:600;margin:12px 0 0 0;">Valid for 2 minutes. Never share this code with anyone.</p>
              </div>
              <p style="color:#4b5563;font-size:12px;line-height:1.5;margin:16px 0 0 0;">If you did not request this, you can safely ignore this e-mail. HireJob staff will never ask for your code or password.</p>
              <p style="color:#9ca3af;font-size:11px;text-align:center;margin:20px 0 0 0;">&copy; %d HireJob Sri Lanka</p>
            </div>
            """.formatted(HtmlUtils.htmlEscape(purposeLabel), HtmlUtils.htmlEscape(code), java.time.Year.now().getValue());
    }

    private boolean sendViaBrevo(String toEmail, String subject, String html, String text) {
        try {
            String senderAddr = (fromEmail == null || fromEmail.isBlank()) ? smtpUsername : fromEmail.trim();
            String json = mapper.writeValueAsString(Map.of(
                    "sender", Map.of("name", fromName, "email", senderAddr),
                    "to", List.of(Map.of("email", toEmail)),
                    "subject", subject,
                    "htmlContent", html,
                    "textContent", text
            ));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .timeout(Duration.ofSeconds(10))
                    .header("api-key", brevoApiKey.trim())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 200 && res.statusCode() < 300) {
                log.info("[EMAIL/BREVO] Verification e-mail sent to {}", maskEmail(toEmail));
                return true;
            }
            log.error("[EMAIL/BREVO] HTTP {} sending to {}: {}", res.statusCode(), maskEmail(toEmail), res.body());
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.error("[EMAIL/BREVO] Failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean sendViaResend(String toEmail, String subject, String html, String text) {
        try {
            String senderAddr = (fromEmail == null || fromEmail.isBlank()) ? "onboarding@resend.dev" : fromEmail.trim();
            String json = mapper.writeValueAsString(Map.of(
                    "from", fromName + " <" + senderAddr + ">",
                    "to", List.of(toEmail),
                    "subject", subject,
                    "html", html,
                    "text", text
            ));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + resendApiKey.trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 200 && res.statusCode() < 300) {
                log.info("[EMAIL/RESEND] Verification e-mail sent to {}", maskEmail(toEmail));
                return true;
            }
            log.error("[EMAIL/RESEND] HTTP {} sending to {}: {}", res.statusCode(), maskEmail(toEmail), res.body());
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.error("[EMAIL/RESEND] Failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean sendViaWebhook(String toEmail, String subject, String html, String text) {
        try {
            String json = mapper.writeValueAsString(Map.of(
                    "to", toEmail,
                    "subject", subject,
                    "html", html,
                    "text", text
            ));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(webhookUrl.trim()))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 200 && res.statusCode() < 400) {
                log.info("[EMAIL/WEBHOOK] Verification e-mail sent to {}", maskEmail(toEmail));
                return true;
            }
            log.error("[EMAIL/WEBHOOK] HTTP {} sending to {}", res.statusCode(), maskEmail(toEmail));
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.error("[EMAIL/WEBHOOK] Failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean sendViaSmtp(String toEmail, String subject, String htmlContent, String plainText, String purposeLabel) {
        try {
            if (mailSender instanceof JavaMailSenderImpl impl && impl.getPassword() != null) {
                // Google displays App Passwords in 4-char groups with spaces; strip spaces cleanly.
                impl.setPassword(impl.getPassword().replaceAll("\\s+", ""));
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(smtpUsername, fromName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(plainText, htmlContent);
            mailSender.send(message);
            log.info("[EMAIL/SMTP] {} code sent to {}", purposeLabel, maskEmail(toEmail));
            return true;
        } catch (Exception e) {
            log.error("[EMAIL/SMTP] Failed to send {} to {} (note: Render Free tier blocks outbound SMTP port 587; set BREVO_API_KEY or EMAIL_WEBHOOK_URL for HTTPS delivery): {}",
                    purposeLabel, maskEmail(toEmail), e.getMessage());
            return false;
        }
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int at = email.indexOf('@');
        String name = email.substring(0, at);
        String visible = name.length() <= 2 ? name.substring(0, 1) : name.substring(0, 2);
        return visible + "***" + email.substring(at);
    }
}
