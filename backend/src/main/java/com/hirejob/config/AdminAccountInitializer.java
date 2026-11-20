package com.hirejob.config;

import com.hirejob.model.entity.User;
import com.hirejob.model.enums.Role;
import com.hirejob.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Creates (or promotes) the company administrator account on start-up from environment variables
 * ADMIN_EMAIL / ADMIN_PASSWORD. Credentials are never stored in source control.
 * Changing ADMIN_PASSWORD and restarting rotates the password and signs out all old admin sessions.
 */
@Component
@RequiredArgsConstructor
public class AdminAccountInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Value("${app.admin.full-name:HireJob Administrator}")
    private String adminFullName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.info("[ADMIN] ADMIN_EMAIL / ADMIN_PASSWORD not set - company admin account not provisioned.");
            return;
        }
        if (adminPassword.length() < 8) {
            log.error("[ADMIN] ADMIN_PASSWORD must be at least 8 characters - admin account not provisioned.");
            return;
        }

        String email = adminEmail.trim().toLowerCase(Locale.ROOT);
        User admin = userRepository.findByEmail(email).orElse(null);

        if (admin == null) {
            admin = User.builder()
                    .fullName(adminFullName)
                    .email(email)
                    .password(passwordEncoder.encode(adminPassword))
                    .role(Role.ROLE_ADMIN)
                    .emailVerified(true)
                    .twoFactorEnabled(false)
                    .active(true)
                    .build();
            userRepository.save(admin);
            log.info("[ADMIN] Company administrator account created for {}", email);
            return;
        }

        boolean changed = false;
        if (Boolean.FALSE.equals(admin.getActive())) {
            admin.setActive(true);
            changed = true;
        }
        if (admin.getRole() != Role.ROLE_ADMIN) {
            admin.setRole(Role.ROLE_ADMIN);
            changed = true;
        }
        if (!passwordEncoder.matches(adminPassword, admin.getPassword())) {
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setTokenVersion(admin.getTokenVersion() == null ? 1 : admin.getTokenVersion() + 1);
            changed = true;
        }
        if (!Boolean.TRUE.equals(admin.getEmailVerified())) {
            admin.setEmailVerified(true);
            changed = true;
        }
        if (changed) {
            userRepository.save(admin);
            log.info("[ADMIN] Company administrator account updated for {}", email);
        }
    }
}
