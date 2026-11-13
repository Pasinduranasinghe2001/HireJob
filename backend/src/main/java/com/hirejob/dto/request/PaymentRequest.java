package com.hirejob.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {

    @NotNull(message = "Job ID is required")
    private Long jobId;

    @NotNull(message = "Package type is required")
    private String packageType; // "7_DAYS_PRIORITY" or "30_DAYS_PRIORITY"

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    @NotNull(message = "Payment method is required")
    private String paymentMethod; // "CARD", "PAYHERE", "BANK_TRANSFER"
}

