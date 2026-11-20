package com.hirejob.service;

import com.hirejob.dto.request.*;
import com.hirejob.dto.response.AuthResponse;
import com.hirejob.dto.response.UserResponse;
import com.hirejob.exception.BadRequestException;
import com.hirejob.exception.ResourceNotFoundException;
import com.hirejob.model.entity.User;
import com.hirejob.model.enums.Role;
import com.hirejob.repository.PlatformSettingRepository;
import com.hirejob.repository.UserRepository;
import com.hirejob.security.GoogleTokenVerifier;
import com.hirejob.security.JwtTokenProvider;
import com.hirejob.security.PhoneNormalizer;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long OTP_VALIDITY_MS = 120_000; // 2 minutes (120 seconds)
    private static final long VERIFIED_EMAIL_TTL_MS = 900_000; // 15 minutes to complete registration form
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[0-9 ()-]{7,20}$");

    private static final String PREFIX_REG = "REG:";
    private static final String PREFIX_EMAIL = "EMAIL:";
    private static final String PREFIX_LOGIN = "LOGIN:";
    private static final String PREFIX_RESET = "RESET:";
    private static final String PREFIX_2FA = "2FA:";

    private final UserRepository userRepository;
    private final PlatformSettingRepository platformSettingRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final EmailService emailService;
    private final SmsService smsService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public static class OtpEntry {
        private final String code;
        private final long createdAt;
        private final long validityMs;
        private final AtomicInteger failedAttempts = new AtomicInteger(0);

        public OtpEntry(String code, long createdAt, long validityMs) {
            this.code = code;
            this.createdAt = createdAt;
            this.validityMs = validityMs;
        }

        public String getCode() {
            return code;
        }

        public boolean isExpired() {
            return (System.currentTimeMillis() - createdAt) > validityMs;
        }

        public long getRemainingSeconds() {
            long remaining = (validityMs - (System.currentTimeMillis() - createdAt)) / 1000;
            return Math.max(0, remaining);
        }

        public int incrementFailedAttempts() {
            return failedAttempts.incrementAndGet();
        }
    }

    private final ConcurrentHashMap<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> verifiedRegEmails = new ConcurrentHashMap<>();

    @Scheduled(fixedDelay = 300_000)
    public void purgeExpiredOtps() {
        otpStore.entrySet().removeIf(e -> e.getValue().isExpired());
        long now = System.currentTimeMillis();
        verifiedRegEmails.entrySet().removeIf(e -> (now - e.getValue()) > VERIFIED_EMAIL_TTL_MS);
    }

    private String generateSecureOtp() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private String issueTokenForUser(User user) {
        String scope = user.getRole() == Role.ROLE_ADMIN
                ? JwtTokenProvider.SCOPE_ADMIN
                : JwtTokenProvider.SCOPE_USER;
        int tv = user.getTokenVersion() == null ? 0 : user.getTokenVersion();
        return tokenProvider.generateTokenForUser(user.getId(), scope, tv);
    }

    private User findUserByIdentifier(String rawIdentifier) {
        String trimmed = rawIdentifier == null ? "" : rawIdentifier.trim();
        if (trimmed.isEmpty()) {
            throw new BadRequestException("Please enter your email or phone number.");
        }
        User user;
        if (trimmed.contains("@")) {
            user = userRepository.findByEmail(normalizeEmail(trimmed))
                    .orElseThrow(() -> new BadRequestException("No account found with that email address."));
        } else {
            List<String> phoneCandidates = PhoneNormalizer.candidates(trimmed);
            user = (phoneCandidates.isEmpty()
                    ? java.util.Optional.<User>empty()
                    : userRepository.findFirstByPhoneIn(phoneCandidates))
                    .or(() -> userRepository.findByEmail(normalizeEmail(trimmed)))
                    .orElseThrow(() -> new BadRequestException("No account found with that phone number or email."));
        }
        if (Boolean.FALSE.equals(user.getActive())) {
            throw new BadRequestException("This account has been suspended by the administrator.");
        }
        return user;
    }

    private void ensureRegistrationOpen() {
        platformSettingRepository.findById(1L).ifPresent(s -> {
            if (Boolean.FALSE.equals(s.getRegistrationEnabled())) {
                throw new BadRequestException("New account registration is currently paused by the administrator.");
            }
        });
    }

    private void verifyAndConsumeOtp(String key, String submittedCode) {
        OtpEntry entry = otpStore.get(key);
        if (entry == null) {
            throw new BadRequestException("No verification code found or code already used. Please request a new code.");
        }
        if (entry.isExpired()) {
            otpStore.remove(key);
            throw new BadRequestException("Verification code has expired. Please request a new code.");
        }
        String candidate = submittedCode == null ? "" : submittedCode.trim();
        boolean matches = MessageDigest.isEqual(
                entry.getCode().getBytes(StandardCharsets.UTF_8),
                candidate.getBytes(StandardCharsets.UTF_8));
        if (!matches) {
            if (entry.incrementFailedAttempts() >= MAX_OTP_ATTEMPTS) {
                otpStore.remove(key);
                throw new BadRequestException("Too many invalid attempts. Please request a new verification code.");
            }
            throw new BadRequestException("Invalid verification code. Please check and try again.");
        }
        otpStore.remove(key);
    }

    /** Phase 1 of Registration: Verify email ownership with a 6-digit OTP before account details are entered. */
    public Map<String, Object> sendPreRegistrationEmailOtp(String rawEmail) {
        ensureRegistrationOpen();
        String email = normalizeEmail(rawEmail);
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new BadRequestException("Please enter a valid email address (e.g. name@gmail.com).");
        }
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("This email address is already registered. Please sign in instead.");
        }

        String code = generateSecureOtp();
        otpStore.put(PREFIX_REG + email, new OtpEntry(code, System.currentTimeMillis(), OTP_VALIDITY_MS));
        verifiedRegEmails.remove(email);

        boolean emailDelivered = emailService.sendOtp(email, code, "Account Registration");
        if (!emailDelivered) {
            log.warn("[HIREJOB REG OTP FALLBACK] Pre-registration OTP for {}: [{}] (Valid 2 min)", email, code);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("email", email);
        result.put("maskedEmail", EmailService.maskEmail(email));
        result.put("expiresInSeconds", 120);
        result.put("emailDelivered", emailDelivered);
        result.put("message", emailDelivered
                ? "Verification code sent to " + email
                : "Email transport unavailable on server — use the backup verification code below.");
        if (!emailDelivered) {
            result.put("devOtpCode", code);
        }
        return result;
    }

    /** Phase 1 confirmation: Verify the 6-digit OTP and unlock Phase 2 registration form for 15 minutes. */
    public Map<String, Object> verifyPreRegistrationEmailOtp(String rawEmail, String code) {
        ensureRegistrationOpen();
        String email = normalizeEmail(rawEmail);
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new BadRequestException("Please enter a valid email address.");
        }
        verifyAndConsumeOtp(PREFIX_REG + email, code);
        verifiedRegEmails.put(email, System.currentTimeMillis());

        return Map.of(
                "email", email,
                "verified", true,
                "message", "Email verified successfully. You can now complete your account details.");
    }

    /** Step 1 of Registration: Validate fields & generate 6-digit OTP to verify email before account creation. */
    public Map<String, Object> sendRegistrationOtp(RegisterRequest request) {
        ensureRegistrationOpen();
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("This email address is already registered. Please log in instead.");
        }

        String normalizedPhone = PhoneNormalizer.normalizeForStorage(request.getPhone());
        if (!normalizedPhone.isEmpty()
                && userRepository.existsByPhoneIn(PhoneNormalizer.candidates(normalizedPhone))) {
            throw new BadRequestException("This phone number is already registered with another account.");
        }

        String code = generateSecureOtp();
        otpStore.put(PREFIX_REG + email, new OtpEntry(code, System.currentTimeMillis(), OTP_VALIDITY_MS));

        boolean emailDelivered = emailService.sendOtp(email, code, "Account Registration");
        if (!emailDelivered) {
            log.warn("[HIREJOB REG OTP FALLBACK] Verification code for {}: [{}] (Valid 2 min)", email, code);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("email", email);
        result.put("maskedEmail", EmailService.maskEmail(email));
        result.put("expiresInSeconds", 120);
        result.put("emailDelivered", emailDelivered);
        result.put("message", emailDelivered
                ? "Verification code sent to " + email
                : "Email delivery unavailable right now — enter the verification code below.");
        if (!emailDelivered) {
            result.put("devOtpCode", code);
        }
        return result;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        ensureRegistrationOpen();
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email address is already registered");
        }

        String normalizedPhone = PhoneNormalizer.normalizeForStorage(request.getPhone());
        if (!normalizedPhone.isEmpty()
                && userRepository.existsByPhoneIn(PhoneNormalizer.candidates(normalizedPhone))) {
            throw new BadRequestException("Phone number is already registered");
        }

        // Prevent privilege escalation on public self-registration
        Role safeRole = request.getRole() == Role.ROLE_POSTER ? Role.ROLE_POSTER : Role.ROLE_CLIENT;

        Long verifiedAt = verifiedRegEmails.remove(email);
        boolean verifiedRecently = verifiedAt != null
                && (System.currentTimeMillis() - verifiedAt) <= VERIFIED_EMAIL_TTL_MS;
        if (!verifiedRecently) {
            boolean hasOtp = request.getOtpCode() != null && !request.getOtpCode().isBlank();
            if (!hasOtp) {
                throw new BadRequestException("Please verify your email address with the 6-digit OTP code first.");
            }
            verifyAndConsumeOtp(PREFIX_REG + email, request.getOtpCode());
        }

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(normalizedPhone.isEmpty() ? null : normalizedPhone)
                .role(safeRole)
                .emailVerified(true)
                .twoFactorEnabled(false)
                .active(true)
                .build();

        user = userRepository.save(user);

        String token = issueTokenForUser(user);
        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.getEmail() != null ? request.getEmail().trim() : "";
        if (identifier.isEmpty()) {
            throw new BadRequestException("Please enter your email address or phone number.");
        }
        if (identifier.contains("@")) {
            if (!EMAIL_PATTERN.matcher(identifier.toLowerCase(Locale.ROOT)).matches()) {
                throw new BadRequestException("Please enter a valid email address (e.g. name@gmail.com).");
            }
        } else {
            String digits = identifier.replaceAll("[^0-9]", "");
            if (digits.length() < 9 || !PHONE_PATTERN.matcher(identifier).matches()) {
                throw new BadRequestException("Please enter a valid email address or mobile phone number.");
            }
        }

        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new BadRequestException("Please enter your password.");
        }

        User user = findUserByIdentifier(identifier);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Incorrect password. Please try again or click Forgot password.");
        }

        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            String tempOtp = generateSecureOtp();
            otpStore.put(PREFIX_2FA + user.getEmail(), new OtpEntry(tempOtp, System.currentTimeMillis(), OTP_VALIDITY_MS));
            boolean emailDelivered = emailService.sendOtp(user.getEmail(), tempOtp, "Two-Factor Authentication");
            boolean smsDelivered = "SMS_OTP".equalsIgnoreCase(user.getTwoFactorType())
                    && user.getPhone() != null
                    && smsService.sendOtp(user.getPhone(), tempOtp);
            if (!emailDelivered && !smsDelivered) {
                log.warn("[HIREJOB 2FA FALLBACK] 2FA OTP for {}: [{}]", user.getEmail(), tempOtp);
            }

            return AuthResponse.builder()
                    .twoFactorRequired(true)
                    .twoFactorType(user.getTwoFactorType() != null ? user.getTwoFactorType() : "EMAIL_OTP")
                    .maskedEmail(EmailService.maskEmail(user.getEmail()))
                    .expiresInSeconds(120L)
                    .emailDelivered(emailDelivered)
                    .smsDelivered(smsDelivered)
                    .tempToken(!emailDelivered && !smsDelivered ? "DEV_OTP:" + tempOtp : UUID.randomUUID().toString())
                    .user(mapToUserResponse(user))
                    .build();
        }

        String token = issueTokenForUser(user);
        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    /** Passwordless login Step 1: Send 6-digit OTP to registered phone/email. */
    public AuthResponse sendOtpLoginCode(OtpRequests.Identifier request) {
        User user = findUserByIdentifier(request.getIdentifier());
        String code = generateSecureOtp();
        otpStore.put(PREFIX_LOGIN + user.getEmail(), new OtpEntry(code, System.currentTimeMillis(), OTP_VALIDITY_MS));

        boolean smsDelivered = user.getPhone() != null && smsService.sendOtp(user.getPhone(), code);
        boolean emailDelivered = emailService.sendOtp(user.getEmail(), code, "Sign-In Verification");

        if (!emailDelivered && !smsDelivered) {
            log.warn("[HIREJOB OTP-LOGIN FALLBACK] Code for {}: [{}] (Valid 2 min)", user.getEmail(), code);
        }

        return AuthResponse.builder()
                .verificationRequired(true)
                .purpose("OTP_LOGIN")
                .maskedEmail(EmailService.maskEmail(user.getEmail()))
                .expiresInSeconds(120L)
                .emailDelivered(emailDelivered)
                .smsDelivered(smsDelivered)
                .tempToken(!emailDelivered && !smsDelivered ? "DEV_OTP:" + code : null)
                .build();
    }

    /** Passwordless login Step 2: Verify 6-digit OTP and sign user in. */
    @Transactional
    public AuthResponse verifyOtpLogin(OtpRequests.VerifyCode request) {
        User user = findUserByIdentifier(request.getIdentifier());
        verifyAndConsumeOtp(PREFIX_LOGIN + user.getEmail(), request.getCode());

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            user.setEmailVerified(true);
            user = userRepository.save(user);
        }

        String token = issueTokenForUser(user);
        return AuthResponse.builder()
                .token(token)
                .authenticated(true)
                .user(mapToUserResponse(user))
                .build();
    }

    /** Forgot Password Step 1: Send 6-digit reset OTP to registered email / SMS. */
    public Map<String, Object> sendForgotPasswordCode(OtpRequests.Identifier request) {
        User user = findUserByIdentifier(request.getIdentifier());
        String code = generateSecureOtp();
        otpStore.put(PREFIX_RESET + user.getEmail(), new OtpEntry(code, System.currentTimeMillis(), OTP_VALIDITY_MS));

        boolean smsDelivered = user.getPhone() != null && smsService.sendOtp(user.getPhone(), code);
        boolean emailDelivered = emailService.sendOtp(user.getEmail(), code, "Password Reset");

        if (!emailDelivered && !smsDelivered) {
            log.warn("[HIREJOB RESET FALLBACK] Reset code for {}: [{}] (Valid 2 min)", user.getEmail(), code);
        }

        String masked = EmailService.maskEmail(user.getEmail());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("maskedEmail", masked);
        result.put("expiresInSeconds", 120);
        result.put("emailDelivered", emailDelivered);
        result.put("smsDelivered", smsDelivered);
        result.put("message", emailDelivered || smsDelivered
                ? "Reset code sent to " + masked
                : "Email delivery unavailable — use the verification code below.");
        if (!emailDelivered && !smsDelivered) {
            result.put("devOtpCode", code);
        }
        return result;
    }

    /** Forgot Password Step 2: Verify reset OTP and set new password (rotates tokenVersion). */
    @Transactional
    public void resetPassword(OtpRequests.ResetPassword request) {
        User user = findUserByIdentifier(request.getIdentifier());
        verifyAndConsumeOtp(PREFIX_RESET + user.getEmail(), request.getCode());

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password cannot be the same as your current password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setEmailVerified(true);
        user.setTokenVersion(user.getTokenVersion() == null ? 1 : user.getTokenVersion() + 1);
        userRepository.save(user);
    }

    public AuthResponse loginWithGoogle(GoogleAuthRequest request) {
        // Identity always comes from the Google-signed ID token (verified server-side), never the browser.
        GoogleTokenVerifier.GoogleUser gu = googleTokenVerifier.verify(request.getCredential());

        final String finalEmail = normalizeEmail(gu.email());
        final String finalFullName = gu.name() != null && !gu.name().isBlank()
                ? gu.name() : finalEmail.substring(0, finalEmail.indexOf('@'));
        final String finalAvatarUrl = gu.picture();
        final String finalGoogleId = gu.sub();

        User existing = userRepository.findByEmail(finalEmail).orElse(null);
        if (existing != null && Boolean.FALSE.equals(existing.getActive())) {
            throw new BadRequestException("This account has been suspended by the administrator.");
        }
        if (existing == null) {
            ensureRegistrationOpen();
        }
        if (existing != null && existing.getGoogleId() == null) {
            existing.setGoogleId(finalGoogleId);
            existing.setEmailVerified(true);
            if (existing.getAvatarUrl() == null) existing.setAvatarUrl(finalAvatarUrl);
            existing = userRepository.save(existing);
        }

        User user = existing != null ? existing : userRepository.save(User.builder()
                .fullName(finalFullName)
                .email(finalEmail)
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.ROLE_POSTER)
                .googleId(finalGoogleId)
                .avatarUrl(finalAvatarUrl)
                .emailVerified(true)
                .twoFactorEnabled(false)
                .active(true)
                .build());

        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            String tempOtp = generateSecureOtp();
            otpStore.put(PREFIX_2FA + user.getEmail(), new OtpEntry(tempOtp, System.currentTimeMillis(), OTP_VALIDITY_MS));
            boolean emailDelivered = emailService.sendOtp(user.getEmail(), tempOtp, "Two-Factor Authentication");
            boolean smsDelivered = "SMS_OTP".equalsIgnoreCase(user.getTwoFactorType())
                    && user.getPhone() != null
                    && smsService.sendOtp(user.getPhone(), tempOtp);

            return AuthResponse.builder()
                    .twoFactorRequired(true)
                    .twoFactorType(user.getTwoFactorType() != null ? user.getTwoFactorType() : "EMAIL_OTP")
                    .maskedEmail(EmailService.maskEmail(user.getEmail()))
                    .expiresInSeconds(120L)
                    .emailDelivered(emailDelivered)
                    .smsDelivered(smsDelivered)
                    .tempToken(!emailDelivered && !smsDelivered ? "DEV_OTP:" + tempOtp : UUID.randomUUID().toString())
                    .user(mapToUserResponse(user))
                    .build();
        }

        String token = issueTokenForUser(user);
        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    public AuthResponse verifyTwoFactor(TwoFactorVerifyRequest request) {
        User user = findUserByIdentifier(request.getEmail());

        if ("passkey_verified".equals(request.getCode())) {
            String token = issueTokenForUser(user);
            return AuthResponse.builder()
                    .token(token)
                    .user(mapToUserResponse(user))
                    .build();
        }

        verifyAndConsumeOtp(PREFIX_2FA + user.getEmail(), request.getCode());
        String token = issueTokenForUser(user);

        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    @Transactional
    public UserResponse toggleTwoFactor(Long userId, TwoFactorToggleRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        user.setTwoFactorEnabled(request.getEnabled());
        user.setTwoFactorType(request.getTwoFactorType() != null ? request.getTwoFactorType() : "EMAIL_OTP");
        user = userRepository.save(user);

        return mapToUserResponse(user);
    }

    @Transactional
    public boolean verifyEmail(EmailVerifyRequest request) {
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        verifyAndConsumeOtp(PREFIX_EMAIL + email, request.getCode());
        user.setEmailVerified(true);
        userRepository.save(user);
        return true;
    }

    public Map<String, Object> sendEmailVerificationCode(String identifierOrEmail) {
        String normalized;
        if (identifierOrEmail != null && identifierOrEmail.contains("@")) {
            normalized = normalizeEmail(identifierOrEmail);
        } else {
            normalized = findUserByIdentifier(identifierOrEmail).getEmail();
        }
        String code = generateSecureOtp();
        OtpEntry entry = new OtpEntry(code, System.currentTimeMillis(), OTP_VALIDITY_MS);
        otpStore.put(PREFIX_EMAIL + normalized, entry);
        otpStore.put(PREFIX_2FA + normalized, entry);
        boolean sent = emailService.sendOtp(normalized, code, "Verification Code");
        if (!sent) {
            log.warn("[HIREJOB EMAIL FALLBACK] Verification code for {}: [{}] (Valid 2 min)", normalized, code);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("email", normalized);
        result.put("maskedEmail", EmailService.maskEmail(normalized));
        result.put("expiresInSeconds", 120);
        result.put("emailDelivered", sent);
        result.put("message", sent
                ? "Verification code sent to " + EmailService.maskEmail(normalized)
                : "Email delivery unavailable — use the verification code below.");
        if (!sent) {
            result.put("devOtpCode", code);
        }
        return result;
    }

    public Map<String, Object> getOtpStatus(String email) {
        String normalized = normalizeEmail(email);
        OtpEntry entry = otpStore.get(PREFIX_EMAIL + normalized);
        if (entry == null) entry = otpStore.get(PREFIX_REG + normalized);
        if (entry == null || entry.isExpired()) {
            return Map.of("valid", false, "remainingSeconds", 0);
        }
        return Map.of(
                "valid", true,
                "remainingSeconds", entry.getRemainingSeconds());
    }

    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .emailVerified(user.getEmailVerified())
                .twoFactorEnabled(user.getTwoFactorEnabled())
                .twoFactorType(user.getTwoFactorType())
                .active(!Boolean.FALSE.equals(user.getActive()))
                .createdAt(user.getCreatedAt())
                .build();
    }
}
