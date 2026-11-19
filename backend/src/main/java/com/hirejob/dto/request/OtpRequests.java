package com.hirejob.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Request bodies for passwordless code login and forgot-password flows. */
public final class OtpRequests {

    private OtpRequests() {}

    @Data
    public static class Identifier {
        @NotBlank(message = "Email or phone number is required")
        @Size(max = 150)
        private String identifier;
    }

    @Data
    public static class VerifyCode {
        @NotBlank(message = "Email or phone number is required")
        @Size(max = 150)
        private String identifier;

        @NotBlank(message = "Verification code is required")
        @Pattern(regexp = "^\\d{6}$", message = "Code must be 6 digits")
        private String code;
    }

    @Data
    public static class ResetPassword {
        @NotBlank(message = "Email or phone number is required")
        @Size(max = 150)
        private String identifier;

        @NotBlank(message = "Verification code is required")
        @Pattern(regexp = "^\\d{6}$", message = "Code must be 6 digits")
        private String code;

        @NotBlank(message = "New password is required")
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Password must contain at least one letter and one number")
        private String newPassword;
    }
}
