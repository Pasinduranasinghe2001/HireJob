package com.hirejob.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PlatformSettingRequest {

    @NotBlank(message = "Site name is required")
    @Size(max = 120)
    private String siteName;

    @NotBlank(message = "Support email is required")
    @Email(message = "Invalid support email")
    private String supportEmail;

    private Boolean registrationEnabled;
    private Boolean requireEmailVerification;
    private Boolean allowAnonymousBrowsing;

    @DecimalMin("0.1")
    @DecimalMax("1.0")
    private Double spamFlagThreshold;

    @DecimalMin("0")
    private BigDecimal priorityPrice1Day;

    @DecimalMin("0")
    private BigDecimal priorityPrice3Day;

    @DecimalMin("0")
    private BigDecimal priorityPrice7Day;

    @Size(max = 500)
    private String siteAnnouncement;
}
