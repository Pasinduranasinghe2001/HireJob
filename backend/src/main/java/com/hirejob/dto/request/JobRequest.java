package com.hirejob.dto.request;

import com.hirejob.model.enums.JobType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Job type is required")
    private JobType jobType;

    private String category;

    private String location;

    private Double latitude;

    private Double longitude;

    private BigDecimal salaryMin;

    private BigDecimal salaryMax;

    private Integer durationDays; // null or 0 = Unlimited, or 7, 14, 30, etc.

    private String contactPhone;

    private String contactWhatsapp;

    private String contactEmail;
}
