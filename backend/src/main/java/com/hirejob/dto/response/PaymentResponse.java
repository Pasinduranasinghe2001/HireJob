package com.hirejob.dto.response;

import com.hirejob.model.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {

    private Long id;
    private Long userId;
    private String userFullName;
    private Long jobId;
    private String jobTitle;
    private BigDecimal amount;
    private String packageType;
    private String paymentMethod;
    private String transactionId;
    private PaymentStatus status;
    private LocalDateTime createdAt;
}

