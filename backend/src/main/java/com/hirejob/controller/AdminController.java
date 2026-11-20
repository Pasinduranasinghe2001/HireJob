package com.hirejob.controller;

import com.hirejob.dto.request.AdminUserUpdateRequest;
import com.hirejob.dto.request.CreateTeamUserRequest;
import com.hirejob.dto.request.PlatformSettingRequest;
import com.hirejob.dto.response.*;
import com.hirejob.model.entity.PlatformSetting;
import com.hirejob.model.enums.JobStatus;
import com.hirejob.security.CustomUserDetails;
import com.hirejob.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsResponse>> getStats() {
        return ResponseEntity.ok(ApiResponse.success("Platform statistics retrieved", adminService.getPlatformStats()));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success("Users retrieved (passwords strictly protected)", adminService.getAllUsers()));
    }

    @PostMapping("/team")
    public ResponseEntity<ApiResponse<UserResponse>> createTeamMember(@Valid @RequestBody CreateTeamUserRequest request) {
        UserResponse created = adminService.createTeamMember(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Account created successfully", created));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody AdminUserUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        UserResponse updated = adminService.updateUser(id, request, admin.getId());
        return ResponseEntity.ok(ApiResponse.success("Account updated successfully", updated));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails admin) {
        adminService.deleteUser(id, admin.getId());
        return ResponseEntity.ok(ApiResponse.success("Account removed successfully", null));
    }

    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<Page<JobResponse>>> getAllJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllJobsForModeration(page, size)));
    }

    @PutMapping("/jobs/{id}/status")
    public ResponseEntity<ApiResponse<JobResponse>> updateJobStatus(
            @PathVariable Long id,
            @RequestParam JobStatus status) {
        return ResponseEntity.ok(ApiResponse.success("Job status updated", adminService.updateJobStatus(id, status)));
    }

    @PutMapping("/jobs/{id}/flag")
    public ResponseEntity<ApiResponse<JobResponse>> toggleJobFlag(
            @PathVariable Long id,
            @RequestParam boolean flagged) {
        return ResponseEntity.ok(ApiResponse.success("Job flag updated", adminService.toggleJobFlag(id, flagged)));
    }

    @PutMapping("/jobs/{id}/priority")
    public ResponseEntity<ApiResponse<JobResponse>> setJobPriority(
            @PathVariable Long id,
            @RequestParam boolean priority,
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(ApiResponse.success("Job priority updated", adminService.setJobPriority(id, priority, days)));
    }

    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteJob(@PathVariable Long id) {
        adminService.deleteJob(id);
        return ResponseEntity.ok(ApiResponse.success("Job removed by admin", null));
    }

    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPlatformTasks() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllPlatformTasks()));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getAllPayments() {
        return ResponseEntity.ok(ApiResponse.success("Company revenue records retrieved", adminService.getAllCompanyPayments()));
    }

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSettings() {
        PlatformSetting settings = adminService.getOrCreateSettings();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("settings", settings);
        payload.put("diagnostics", adminService.getSystemDiagnostics());
        return ResponseEntity.ok(ApiResponse.success(payload));
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<PlatformSetting>> updateSettings(
            @Valid @RequestBody PlatformSettingRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        PlatformSetting updated = adminService.updateSettings(request, admin.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Platform settings saved", updated));
    }
}
