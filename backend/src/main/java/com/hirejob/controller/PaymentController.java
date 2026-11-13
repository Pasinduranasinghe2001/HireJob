package com.hirejob.controller;

import com.hirejob.dto.request.PaymentRequest;
import com.hirejob.dto.response.ApiResponse;
import com.hirejob.dto.response.PaymentResponse;
import com.hirejob.security.CustomUserDetails;
import com.hirejob.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/priority-boost")
    public ResponseEntity<ApiResponse<PaymentResponse>> processBoost(
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        PaymentResponse response = paymentService.processPriorityPayment(request, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Priority boost payment successful! Post is now promoted to top.", response));
    }

    @GetMapping("/my-payments")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPayments(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<PaymentResponse> payments = paymentService.getUserPayments(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(payments));
    }
}

