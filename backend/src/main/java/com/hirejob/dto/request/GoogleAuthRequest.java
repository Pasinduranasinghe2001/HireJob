package com.hirejob.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Google Identity Services sign-in. Only the Google-signed ID token (credential) is trusted;
 * name / e-mail / picture are always taken from the verified token, never from the browser.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoogleAuthRequest {

    @NotBlank(message = "Google credential is required")
    @Size(max = 4096)
    private String credential;
}
