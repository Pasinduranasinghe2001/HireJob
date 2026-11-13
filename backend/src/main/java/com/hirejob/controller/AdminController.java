package com.hirejob.controller;

import com.hirejob.dto.response.*;
import com.hirejob.model.enums.JobStatus;
import com.hirejob.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsResponse>> getStats() {
        AdminStatsResponse stats = adminService.getPlatformStats();
        return ResponseEntity.ok(ApiResponse.success("Platform statistics retrieved", stats));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        // Passwords are encrypted and omitted for privacy
        List<UserResponse> users = adminService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success("Users retrieved (passwords strictly protected)", users));
    }

    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<Page<JobResponse>>> getAllJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Page<JobResponse> jobs = adminService.getAllJobsForModeration(page, size);
        return ResponseEntity.ok(ApiResponse.success(jobs));
    }

    @PutMapping("/jobs/{id}/status")
    public ResponseEntity<ApiResponse<JobResponse>> updateJobStatus(
            @PathVariable Long id,
            @RequestParam JobStatus status) {
        JobResponse job = adminService.updateJobStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Job status updated", job));
    }

    @PutMapping("/jobs/{id}/flag")
    public ResponseEntity<ApiResponse<JobResponse>> toggleJobFlag(
            @PathVariable Long id,
            @RequestParam boolean flagged) {
        JobResponse job = adminService.toggleJobFlag(id, flagged);
        return ResponseEntity.ok(ApiResponse.success("Job flag updated", job));
    }

    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteJob(@PathVariable Long id) {
        adminService.deleteJob(id);
        return ResponseEntity.ok(ApiResponse.success("Job deleted by admin", null));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getAllPayments() {
        List<PaymentResponse> payments = adminService.getAllCompanyPayments();
        return ResponseEntity.ok(ApiResponse.success("Company revenue records retrieved", payments));
    }
}

