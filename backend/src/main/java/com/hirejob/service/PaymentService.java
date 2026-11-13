package com.hirejob.service;

import com.hirejob.dto.request.PaymentRequest;
import com.hirejob.dto.response.PaymentResponse;
import com.hirejob.exception.ResourceNotFoundException;
import com.hirejob.exception.UnauthorizedException;
import com.hirejob.model.entity.Job;
import com.hirejob.model.entity.Payment;
import com.hirejob.model.entity.User;
import com.hirejob.model.enums.PaymentStatus;
import com.hirejob.repository.JobRepository;
import com.hirejob.repository.PaymentRepository;
import com.hirejob.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    @Transactional
    public PaymentResponse processPriorityPayment(PaymentRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", request.getJobId()));

        if (!job.getPostedBy().getId().equals(userId)) {
            throw new UnauthorizedException("You can only purchase priority boosts for your own listings");
        }

        int durationDays = 7;
        if ("30_DAYS_PRIORITY".equalsIgnoreCase(request.getPackageType())) {
            durationDays = 30;
        }

        String transactionId = "HJ-PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Payment payment = Payment.builder()
                .user(user)
                .job(job)
                .amount(request.getAmount() != null ? request.getAmount() : new BigDecimal("2500.00"))
                .packageType(request.getPackageType())
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "ONLINE_VISA_MC")
                .transactionId(transactionId)
                .status(PaymentStatus.COMPLETED)
                .build();

        payment = paymentRepository.save(payment);

        job.setIsPriority(true);
        job.setPriorityExpiresAt(LocalDateTime.now().plusDays(durationDays));
        jobRepository.save(job);

        return mapToPaymentResponse(payment);
    }

    public List<PaymentResponse> getUserPayments(Long userId) {
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToPaymentResponse)
                .toList();
    }

    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToPaymentResponse)
                .toList();
    }

    public PaymentResponse mapToPaymentResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .userId(payment.getUser().getId())
                .userFullName(payment.getUser().getFullName())
                .jobId(payment.getJob().getId())
                .jobTitle(payment.getJob().getTitle())
                .amount(payment.getAmount())
                .packageType(payment.getPackageType())
                .paymentMethod(payment.getPaymentMethod())
                .transactionId(payment.getTransactionId())
                .status(payment.getStatus())
                .createdAt(payment.getCreatedAt())
                .build();
    }
}
