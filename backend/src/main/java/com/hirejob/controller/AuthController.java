package com.hirejob.controller;

import com.hirejob.dto.request.*;
import com.hirejob.dto.response.ApiResponse;
import com.hirejob.dto.response.AuthResponse;
import com.hirejob.dto.response.UserResponse;
import com.hirejob.security.CustomUserDetails;
import com.hirejob.security.GoogleTokenVerifier;
import com.hirejob.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GoogleTokenVerifier googleTokenVerifier;

    /** Public: lets the frontend render the official Google button with the configured OAuth client id. */
    @GetMapping("/google/config")
    public ResponseEntity<ApiResponse<Map<String, Object>>> googleConfig() {
        String clientId = googleTokenVerifier.getClientId();
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "enabled", clientId != null,
                "clientId", clientId == null ? "" : clientId)));
    }

    @PostMapping("/register/send-email-otp")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendPreRegistrationEmailOtp(
            @Valid @RequestBody OtpRequests.Identifier request) {
        Map<String, Object> result = authService.sendPreRegistrationEmailOtp(request.getIdentifier());
        return ResponseEntity.ok(ApiResponse.success("Verification code sent to your email", result));
    }

    @PostMapping("/register/verify-email-otp")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyPreRegistrationEmailOtp(
            @Valid @RequestBody OtpRequests.VerifyCode request) {
        Map<String, Object> result = authService.verifyPreRegistrationEmailOtp(request.getIdentifier(), request.getCode());
        return ResponseEntity.ok(ApiResponse.success("Email verified successfully", result));
    }

    @PostMapping("/register/send-otp")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendRegistrationOtp(@Valid @RequestBody RegisterRequest request) {
        Map<String, Object> result = authService.sendRegistrationOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Verification code sent to your email", result));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse authResponse = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful", authResponse));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse authResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }

    @PostMapping("/otp-login/send")
    public ResponseEntity<ApiResponse<AuthResponse>> sendOtpLoginCode(@Valid @RequestBody OtpRequests.Identifier request) {
        AuthResponse result = authService.sendOtpLoginCode(request);
        return ResponseEntity.ok(ApiResponse.success("Verification code sent", result));
    }

    @PostMapping("/otp-login/verify")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtpLogin(@Valid @RequestBody OtpRequests.VerifyCode request) {
        AuthResponse authResponse = authService.verifyOtpLogin(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }

    @PostMapping("/forgot-password/send")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendForgotPasswordCode(@Valid @RequestBody OtpRequests.Identifier request) {
        Map<String, Object> result = authService.sendForgotPasswordCode(request);
        return ResponseEntity.ok(ApiResponse.success("Reset code sent", result));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody OtpRequests.ResetPassword request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful! You can now log in.", null));
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(@Valid @RequestBody GoogleAuthRequest request) {
        AuthResponse authResponse = authService.loginWithGoogle(request);
        return ResponseEntity.ok(ApiResponse.success("Google authentication successful", authResponse));
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyTwoFactor(@Valid @RequestBody TwoFactorVerifyRequest request) {
        AuthResponse authResponse = authService.verifyTwoFactor(request);
        return ResponseEntity.ok(ApiResponse.success("Two-factor verification successful", authResponse));
    }

    @PostMapping("/toggle-2fa")
    public ResponseEntity<ApiResponse<UserResponse>> toggleTwoFactor(
            @Valid @RequestBody TwoFactorToggleRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        UserResponse user = authService.toggleTwoFactor(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("2FA settings updated", user));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<Boolean>> verifyEmail(@Valid @RequestBody EmailVerifyRequest request) {
        boolean verified = authService.verifyEmail(request);
        return ResponseEntity.ok(ApiResponse.success("Email verified successfully", verified));
    }

    @PostMapping("/send-verification-email")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendVerificationEmail(@RequestParam String email) {
        Map<String, Object> result = authService.sendEmailVerificationCode(email);
        return ResponseEntity.ok(ApiResponse.success("Verification code dispatched", result));
    }

    @GetMapping("/otp-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOtpStatus(@RequestParam String email) {
        Map<String, Object> status = authService.getOtpStatus(email);
        return ResponseEntity.ok(ApiResponse.success(status));
    }
}
