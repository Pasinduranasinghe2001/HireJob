package com.hirejob.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Sends one-time verification codes through Gmail SMTP (configure SPRING_MAIL_USERNAME /
 * SPRING_MAIL_PASSWORD in backend/.env). When SMTP is not configured (local development only)
 * the code is written to the server console so developers can still test the flow.
 */
@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public boolean isConfigured() {
        return mailSender != null && fromEmail != null && !fromEmail.isBlank()
                && mailPassword != null && !mailPassword.isBlank()
                && !fromEmail.startsWith("your.address");
    }

    /**
     * @return true when the e-mail was handed to the SMTP server successfully.
     */
    public boolean sendOtp(String toEmail, String code, String purposeLabel) {
        if (!isConfigured()) {
            log.warn("[EMAIL] SMTP is NOT configured (set SPRING_MAIL_USERNAME / SPRING_MAIL_PASSWORD in backend/.env). " +
                    "DEV ONLY - {} code for {}: {}", purposeLabel, toEmail, code);
            return false;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "HireJob Sri Lanka");
            helper.setTo(toEmail);
            helper.setSubject("HireJob " + purposeLabel + " code: " + code);

            String htmlContent = """
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;">
                  <h2 style="color:#2563eb;margin:0 0 4px 0;font-size:22px;text-align:center;">HireJob Sri Lanka</h2>
                  <p style="color:#6b7280;font-size:13px;margin:0 0 20px 0;text-align:center;">%s</p>
                  <div style="background:#f8fafc;border-radius:12px;padding:20px;text-align:center;">
                    <p style="color:#374151;font-size:14px;margin:0 0 12px 0;">Your one-time verification code is:</p>
                    <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1e40af;font-family:monospace;padding:10px 16px;background:#e0e7ff;border-radius:8px;display:inline-block;">%s</div>
                    <p style="color:#dc2626;font-size:12px;font-weight:600;margin:12px 0 0 0;">Valid for 2 minutes. Never share this code with anyone.</p>
                  </div>
                  <p style="color:#4b5563;font-size:12px;line-height:1.5;margin:16px 0 0 0;">If you did not try to sign in, you can ignore this e-mail - your password is still safe. HireJob staff will never ask for this code.</p>
                  <p style="color:#9ca3af;font-size:11px;text-align:center;margin:20px 0 0 0;">&copy; %d HireJob Sri Lanka</p>
                </div>
                """.formatted(HtmlUtils.htmlEscape(purposeLabel), HtmlUtils.htmlEscape(code), java.time.Year.now().getValue());

            helper.setText("Your HireJob verification code is " + code + " (valid for 2 minutes).", htmlContent);
            mailSender.send(message);
            log.info("[EMAIL] {} code sent to {}", purposeLabel, maskEmail(toEmail));
            return true;
        } catch (Exception e) {
            log.error("[EMAIL] Failed to send {} e-mail to {}: {}", purposeLabel, maskEmail(toEmail), e.getMessage());
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
