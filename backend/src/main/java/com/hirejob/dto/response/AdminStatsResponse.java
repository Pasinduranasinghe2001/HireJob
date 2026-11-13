package com.hirejob.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminStatsResponse {

    private long totalUsers;
    private long totalPosters;
    private long totalClients;
    private long totalActiveJobs;
    private long totalPriorityJobs;
    private long totalFlaggedSpamJobs;
    private BigDecimal totalCompanyRevenue;
}

