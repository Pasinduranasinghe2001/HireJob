package com.hirejob.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "platform_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSetting {

    @Id
    private Long id;

    @Column(nullable = false)
    @Builder.Default
    private String siteName = "HireJob Sri Lanka";

    @Column(nullable = false)
    @Builder.Default
    private String supportEmail = "pasinduworkwebsite@gmail.com";

    @Column(nullable = false)
    @Builder.Default
    private Boolean registrationEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean requireEmailVerification = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean allowAnonymousBrowsing = true;

    @Column(nullable = false)
    @Builder.Default
    private Double spamFlagThreshold = 0.50;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal priorityPrice1Day = new BigDecimal("500");

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal priorityPrice3Day = new BigDecimal("1200");

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal priorityPrice7Day = new BigDecimal("2500");

    @Column(length = 500)
    private String siteAnnouncement;

    private String updatedBy;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
