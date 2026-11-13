package com.hirejob.controller;

import com.hirejob.dto.request.*;
import com.hirejob.dto.response.ApiResponse;
import com.hirejob.dto.response.AuthResponse;
import com.hirejob.dto.response.UserResponse;
import com.hirejob.security.CustomUserDetails;
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
