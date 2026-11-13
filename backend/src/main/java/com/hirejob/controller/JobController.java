package com.hirejob.controller;

import com.hirejob.dto.request.JobRequest;
import com.hirejob.dto.response.ApiResponse;
import com.hirejob.dto.response.JobResponse;
import com.hirejob.security.CustomUserDetails;
import com.hirejob.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<JobResponse>>> getAllJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size) {
        Page<JobResponse> jobs = jobService.getAllJobs(page, size);
        return ResponseEntity.ok(ApiResponse.success(jobs));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> getJobById(@PathVariable Long id) {
        JobResponse job = jobService.getJobById(id);
        return ResponseEntity.ok(ApiResponse.success(job));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<JobResponse>>> searchJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size) {
        Page<JobResponse> jobs = jobService.searchJobs(keyword, location, type, page, size);
        return ResponseEntity.ok(ApiResponse.success(jobs));
    }

    @GetMapping("/my-jobs")
    public ResponseEntity<ApiResponse<List<JobResponse>>> getMyJobs(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<JobResponse> jobs = jobService.getJobsByUser(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(jobs));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<JobResponse>> createJob(
            @Valid @RequestBody JobRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        JobResponse job = jobService.createJob(request, userDetails.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Job created successfully", job));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> updateJob(
            @PathVariable Long id,
            @Valid @RequestBody JobRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        JobResponse job = jobService.updateJob(id, request, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Job updated successfully", job));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteJob(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        jobService.deleteJob(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Job deleted successfully", null));
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<ApiResponse<String>> uploadImage(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String imageUrl = jobService.uploadImage(id, file, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Image uploaded successfully", imageUrl));
    }

    @PostMapping("/{id}/images")
    public ResponseEntity<ApiResponse<List<String>>> uploadImages(
            @PathVariable Long id,
            @RequestParam("images") List<MultipartFile> files,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<String> imageUrls = jobService.uploadImages(id, files, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Images uploaded successfully (Max 5)", imageUrls));
    }

    @PostMapping("/{id}/promote")
    public ResponseEntity<ApiResponse<JobResponse>> promoteJob(
            @PathVariable Long id,
            @RequestParam(defaultValue = "7") int days,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        JobResponse job = jobService.upgradeToPriority(id, days, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Job promoted to priority successfully", job));
    }
}

