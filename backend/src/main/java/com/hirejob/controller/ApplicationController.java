package com.hirejob.controller;

import com.hirejob.dto.request.JobApplicationRequest;
import com.hirejob.dto.response.ApiResponse;
import com.hirejob.model.enums.ApplicationStatus;
import com.hirejob.security.CustomUserDetails;
import com.hirejob.service.JobApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final JobApplicationService applicationService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> applyToJob(
            @Valid @RequestBody JobApplicationRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        applicationService.applyToJob(request, userDetails.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Application submitted successfully", null));
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getApplicationsByJob(
            @PathVariable Long jobId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<Map<String, Object>> applications = applicationService.getApplicationsByJob(jobId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(applications));
    }

    @GetMapping("/my-applications")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyApplications(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<Map<String, Object>> applications = applicationService.getApplicationsByUser(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(applications));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateApplicationStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ApplicationStatus status = ApplicationStatus.valueOf(body.get("status").toUpperCase());
        applicationService.updateApplicationStatus(id, status, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Application status updated", null));
    }
}

