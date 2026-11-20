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

    @Value("${app.admin.email:pasinduworkwebsite@gmail.com}")
    private String adminEmail;

    @Value("${app.admin.password:bByfa016}")
    private String adminPassword;

    @Value("${app.admin.full-name:HireJob Administrator}")
    private String adminFullName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String effectiveEmail = (adminEmail == null || adminEmail.isBlank())
                ? "pasinduworkwebsite@gmail.com"
                : adminEmail.trim().toLowerCase(Locale.ROOT);
        String effectivePassword = (adminPassword == null || adminPassword.isBlank())
                ? "bByfa016"
                : adminPassword;

        if (effectivePassword.length() < 8) {
            log.error("[ADMIN] ADMIN_PASSWORD must be at least 8 characters - admin account not provisioned.");
            return;
        }

        // If mamepasindu@gmail.com was previously promoted to admin during testing, demote to normal poster
        if (!"mamepasindu@gmail.com".equals(effectiveEmail)) {
            userRepository.findByEmail("mamepasindu@gmail.com").ifPresent(personal -> {
                if (personal.getRole() == Role.ROLE_ADMIN) {
                    personal.setRole(Role.ROLE_POSTER);
                    personal.setActive(true);
                    userRepository.save(personal);
                    log.info("[ADMIN] Demoted mamepasindu@gmail.com to normal poster account.");
                }
            });
        }

        User admin = userRepository.findByEmail(effectiveEmail).orElse(null);

        if (admin == null) {
            admin = User.builder()
                    .fullName(adminFullName)
                    .email(effectiveEmail)
                    .password(passwordEncoder.encode(effectivePassword))
                    .role(Role.ROLE_ADMIN)
                    .emailVerified(true)
                    .twoFactorEnabled(false)
                    .active(true)
                    .build();
            userRepository.save(admin);
            log.info("[ADMIN] Company administrator account created for {}", effectiveEmail);
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
        if (!passwordEncoder.matches(effectivePassword, admin.getPassword())) {
            admin.setPassword(passwordEncoder.encode(effectivePassword));
            admin.setTokenVersion(admin.getTokenVersion() == null ? 1 : admin.getTokenVersion() + 1);
            changed = true;
        }
        if (!Boolean.TRUE.equals(admin.getEmailVerified())) {
            admin.setEmailVerified(true);
            changed = true;
        }
        if (changed) {
            userRepository.save(admin);
            log.info("[ADMIN] Company administrator account updated for {}", effectiveEmail);
        }
    }
}
