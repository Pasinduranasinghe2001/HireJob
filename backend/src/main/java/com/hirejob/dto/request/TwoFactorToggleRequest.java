package com.hirejob.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorToggleRequest {

    @NotNull
    private Boolean enabled;

    @Pattern(regexp = "^(EMAIL_OTP|SMS_OTP|PASSKEY)?$", message = "Unsupported 2FA method")
    private String twoFactorType;
}
