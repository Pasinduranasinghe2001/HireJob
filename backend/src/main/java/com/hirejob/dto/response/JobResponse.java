package com.hirejob.dto.response;

import com.hirejob.model.enums.JobStatus;
import com.hirejob.model.enums.JobType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobResponse {

    private Long id;
    private String title;
    private String description;
    private JobType jobType;
    private String category;
    private String location;
    private Double latitude;
    private Double longitude;
    private BigDecimal salaryMin;
    private BigDecimal salaryMax;
    private String imageUrl;
    private java.util.List<String> imageUrls;
    private Integer durationDays;
    private LocalDateTime expiresAt;
    private Boolean isPriority;
    private LocalDateTime priorityExpiresAt;
    private String contactPhone;
    private String contactWhatsapp;
    private String contactEmail;
    private Integer viewsCount;
    private Double spamScore;
    private Boolean isFlagged;
    private JobStatus status;
    private UserResponse postedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
