package com.hirejob.controller;

import com.hirejob.dto.response.ApiResponse;
import com.hirejob.dto.response.UserResponse;
import com.hirejob.security.CustomUserDetails;
import com.hirejob.service.ReviewService;
import com.hirejob.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ReviewService reviewService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        UserResponse user = userService.getUserById(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, String> updates) {
        UserResponse user = userService.updateUser(
                userDetails.getId(),
                updates.get("fullName"),
                updates.get("phone")
        );
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", user));
    }

    @GetMapping("/{id}/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserProfile(@PathVariable Long id) {
        UserResponse user = userService.getUserById(id);
        Double averageRating = reviewService.getAverageRating(id);
        Map<String, Object> profile = Map.of(
                "user", user,
                "averageRating", averageRating
        );
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}

