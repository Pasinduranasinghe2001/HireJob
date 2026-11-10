package com.hirejob.service;

import com.hirejob.dto.request.ReviewRequest;
import com.hirejob.dto.response.ReviewResponse;
import com.hirejob.dto.response.UserResponse;
import com.hirejob.exception.BadRequestException;
import com.hirejob.exception.ResourceNotFoundException;
import com.hirejob.model.entity.Job;
import com.hirejob.model.entity.Review;
import com.hirejob.model.entity.User;
import com.hirejob.repository.JobRepository;
import com.hirejob.repository.ReviewRepository;
import com.hirejob.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    public ReviewResponse createReview(ReviewRequest request, Long reviewerId) {
        if (reviewerId.equals(request.getRevieweeId())) {
            throw new BadRequestException("You cannot review yourself");
        }

        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", request.getJobId()));

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", reviewerId));

        User reviewee = userRepository.findById(request.getRevieweeId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getRevieweeId()));

        Review review = Review.builder()
                .job(job)
                .reviewer(reviewer)
                .reviewee(reviewee)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        review = reviewRepository.save(review);
        return mapToReviewResponse(review);
    }

    public List<ReviewResponse> getReviewsByJob(Long jobId) {
        return reviewRepository.findByJobId(jobId).stream()
                .map(this::mapToReviewResponse)
                .toList();
    }

    public List<ReviewResponse> getReviewsByUser(Long userId) {
        return reviewRepository.findByRevieweeId(userId).stream()
                .map(this::mapToReviewResponse)
                .toList();
    }

    public Double getAverageRating(Long userId) {
        Double avg = reviewRepository.getAverageRatingByRevieweeId(userId);
        return avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
    }

    private ReviewResponse mapToReviewResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .jobId(review.getJob().getId())
                .jobTitle(review.getJob().getTitle())
                .reviewer(mapToUserResponse(review.getReviewer()))
                .reviewee(mapToUserResponse(review.getReviewee()))
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}

