package com.hirejob.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private UserResponse user;

    // 2FA and OTP challenge details
    private Boolean twoFactorRequired;
    private String twoFactorType;
    private String tempToken;

    private Boolean authenticated;
    private Boolean verificationRequired;
    private String purpose;
    private String challengeId;
    private String maskedEmail;
    private Long expiresInSeconds;
    private Long resendAvailableInSeconds;
    private Boolean emailDelivered;
    private Boolean smsDelivered;
}
