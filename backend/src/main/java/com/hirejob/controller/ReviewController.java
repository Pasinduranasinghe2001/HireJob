package com.hirejob.controller;

import com.hirejob.dto.request.ReviewRequest;
import com.hirejob.dto.response.ApiResponse;
import com.hirejob.dto.response.ReviewResponse;
import com.hirejob.security.CustomUserDetails;
import com.hirejob.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ReviewResponse review = reviewService.createReview(request, userDetails.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Review created successfully", review));
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getReviewsByJob(@PathVariable Long jobId) {
        List<ReviewResponse> reviews = reviewService.getReviewsByJob(jobId);
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getReviewsByUser(@PathVariable Long userId) {
        List<ReviewResponse> reviews = reviewService.getReviewsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }
}

