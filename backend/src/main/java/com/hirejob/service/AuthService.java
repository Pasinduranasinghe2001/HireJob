package com.hirejob.service;

import com.hirejob.dto.request.*;
import com.hirejob.dto.response.AuthResponse;
import com.hirejob.dto.response.UserResponse;
import com.hirejob.exception.BadRequestException;
import com.hirejob.exception.ResourceNotFoundException;
import com.hirejob.exception.UnauthorizedException;
import com.hirejob.model.entity.User;
import com.hirejob.model.enums.Role;
import com.hirejob.repository.UserRepository;
import com.hirejob.security.GoogleTokenVerifier;
import com.hirejob.security.JwtTokenProvider;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long OTP_VALIDITY_MS = 300_000; // 5 minutes

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final SmsService smsService;
    private final GoogleTokenVerifier googleTokenVerifier;

    @Data
    @AllArgsConstructor
    public static class OtpEntry {
        private String code;
        private long createdAt;
        private long validityMs;

        public boolean isExpired() {
            return (System.currentTimeMillis() - createdAt) > validityMs;
        }

        public long getRemainingSeconds() {
            long remaining = (validityMs - (System.currentTimeMillis() - createdAt)) / 1000;
            return Math.max(0, remaining);
        }
    }

    // In-memory OTP storage for verification with timestamps
    private final ConcurrentHashMap<String, OtpEntry> otpStore = new ConcurrentHashMap<>();

    private String generateSecureOtp() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email address is already registered");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole())
                .emailVerified(false)
                .twoFactorEnabled(false)
                .build();

        user = userRepository.save(user);

        // Generate dynamic 6-digit code for registration
        String code = generateSecureOtp();
        otpStore.put(user.getEmail(), new OtpEntry(code, System.currentTimeMillis(), OTP_VALIDITY_MS));
        emailService.sendOtp(user.getEmail(), code, "Email Verification");
        log.info("[HIREJOB OTP DISPATCH] Dynamic verification code for {}: [{}] (Valid for 5 minutes)", user.getEmail(), code);

        String token = tokenProvider.generateTokenFromUserId(user.getId());

        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found"));

        // If 2FA is enabled, require 2FA challenge with dynamic code
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            String tempOtp = generateSecureOtp();
            otpStore.put(user.getEmail(), new OtpEntry(tempOtp, System.currentTimeMillis(), OTP_VALIDITY_MS));
            emailService.sendOtp(user.getEmail(), tempOtp, "Two-Factor Authentication");
            if ("SMS_OTP".equalsIgnoreCase(user.getTwoFactorType()) && user.getPhone() != null) {
                smsService.sendOtp(user.getPhone(), tempOtp);
            }
            log.info("[HIREJOB 2FA DISPATCH] Dynamic 2FA OTP for {}: [{}] (Method: {})", user.getEmail(), tempOtp, user.getTwoFactorType());

            return AuthResponse.builder()
                    .twoFactorRequired(true)
                    .twoFactorType(user.getTwoFactorType() != null ? user.getTwoFactorType() : "SMS_OTP")
                    .tempToken(UUID.randomUUID().toString())
                    .user(mapToUserResponse(user))
                    .build();
        }

        String token = tokenProvider.generateToken(authentication);

        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    public AuthResponse loginWithGoogle(GoogleAuthRequest request) {
        String email = normalizeEmail(request.getEmail());
        String fullName = request.getFullName();
        String avatarUrl = request.getAvatarUrl();
        String googleId = request.getGoogleId();

        // If credential is provided and verifier is configured, verify directly
        if (request.getCredential() != null && !request.getCredential().isBlank() && googleTokenVerifier.isConfigured()) {
            GoogleTokenVerifier.GoogleUser gu = googleTokenVerifier.verify(request.getCredential());
            email = normalizeEmail(gu.email());
            fullName = gu.name() != null && !gu.name().isBlank() ? gu.name() : fullName;
            avatarUrl = gu.picture() != null ? gu.picture() : avatarUrl;
            googleId = gu.sub();
        }

        final String finalEmail = email;
        final String finalFullName = fullName != null ? fullName : "User";
        final String finalAvatarUrl = avatarUrl;
        final String finalGoogleId = googleId != null ? googleId : UUID.randomUUID().toString();

        User user = userRepository.findByEmail(finalEmail)
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .fullName(finalFullName)
                            .email(finalEmail)
                            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                            .role(Role.ROLE_CLIENT)
                            .googleId(finalGoogleId)
                            .avatarUrl(finalAvatarUrl)
                            .emailVerified(true)
                            .twoFactorEnabled(false)
                            .build();
                    return userRepository.save(newUser);
                });

        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            String tempOtp = generateSecureOtp();
            otpStore.put(user.getEmail(), new OtpEntry(tempOtp, System.currentTimeMillis(), OTP_VALIDITY_MS));
            emailService.sendOtp(user.getEmail(), tempOtp, "Two-Factor Authentication");
            log.info("[HIREJOB 2FA DISPATCH] Google login 2FA OTP for {}: [{}]", user.getEmail(), tempOtp);

            return AuthResponse.builder()
                    .twoFactorRequired(true)
                    .twoFactorType(user.getTwoFactorType() != null ? user.getTwoFactorType() : "PASSKEY")
                    .tempToken(UUID.randomUUID().toString())
                    .user(mapToUserResponse(user))
                    .build();
        }

        String token = tokenProvider.generateTokenFromUserId(user.getId());
        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    public AuthResponse verifyTwoFactor(TwoFactorVerifyRequest request) {
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        if ("passkey_verified".equals(request.getCode())) {
            String token = tokenProvider.generateTokenFromUserId(user.getId());
            return AuthResponse.builder()
                    .token(token)
                    .user(mapToUserResponse(user))
                    .build();
        }

        OtpEntry entry = otpStore.get(email);
        if (entry == null) {
            throw new BadRequestException("No verification code was requested or code has already been used");
        }

        if (entry.isExpired()) {
            otpStore.remove(email);
            throw new BadRequestException("Verification code has expired. Please request a new code.");
        }

        if (!entry.getCode().equals(request.getCode().trim())) {
            throw new BadRequestException("Invalid verification code. Please check your mobile/email.");
        }

        otpStore.remove(email);
        String token = tokenProvider.generateTokenFromUserId(user.getId());

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
        user.setTwoFactorType(request.getTwoFactorType() != null ? request.getTwoFactorType() : "SMS_OTP");
        user = userRepository.save(user);

        return mapToUserResponse(user);
    }

    @Transactional
    public boolean verifyEmail(EmailVerifyRequest request) {
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        OtpEntry entry = otpStore.get(email);
        if (entry == null) {
            throw new BadRequestException("No verification code found. Please request a new code.");
        }

        if (entry.isExpired()) {
            otpStore.remove(email);
            throw new BadRequestException("Verification code has expired. Please request a new code.");
        }

        if (!entry.getCode().equals(request.getCode().trim())) {
            throw new BadRequestException("Invalid verification code");
        }

        user.setEmailVerified(true);
        userRepository.save(user);
        otpStore.remove(email);
        return true;
    }

    public Map<String, Object> sendEmailVerificationCode(String email) {
        String normalized = normalizeEmail(email);
        String code = generateSecureOtp();
        OtpEntry entry = new OtpEntry(code, System.currentTimeMillis(), OTP_VALIDITY_MS);
        otpStore.put(normalized, entry);
        emailService.sendOtp(normalized, code, "Verification Code");
        log.info("[HIREJOB EMAIL DISPATCH] Sent verification code to {}: [{}] (Valid for 5 minutes)", normalized, code);

        return Map.of(
                "email", normalized,
                "expiresInSeconds", 300,
                "message", "Verification code sent to " + normalized
        );
    }

    public Map<String, Object> getOtpStatus(String email) {
        String normalized = normalizeEmail(email);
        OtpEntry entry = otpStore.get(normalized);
        if (entry == null || entry.isExpired()) {
            return Map.of("valid", false, "remainingSeconds", 0);
        }
        return Map.of(
                "valid", true,
                "remainingSeconds", entry.getRemainingSeconds()
        );
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
                .createdAt(user.getCreatedAt())
                .build();
    }
}
