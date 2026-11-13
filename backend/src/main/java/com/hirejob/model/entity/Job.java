package com.hirejob.model.entity;

import com.hirejob.model.enums.JobStatus;
import com.hirejob.model.enums.JobType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobType jobType;

    private String category;

    private String location;

    private Double latitude;

    private Double longitude;

    private BigDecimal salaryMin;

    private BigDecimal salaryMax;

    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String imageUrls; // Comma-separated list of up to 5 image URLs

    private Integer durationDays; // null = Unlimited

    private LocalDateTime expiresAt; // calculated auto-delete/expiration timestamp

    @Column(nullable = false)
    @Builder.Default
    private Boolean isPriority = false; // Paid bump to top

    private LocalDateTime priorityExpiresAt;

    private String contactPhone;

    private String contactWhatsapp;

    private String contactEmail;

    @Builder.Default
    private Integer viewsCount = 0;

    @Builder.Default
    private Double spamScore = 0.0;

    @Builder.Default
    private Boolean isFlagged = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private JobStatus status = JobStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by", nullable = false)
    private User postedBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
