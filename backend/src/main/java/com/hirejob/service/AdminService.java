package com.hirejob.service;

import com.hirejob.dto.response.AdminStatsResponse;
import com.hirejob.dto.response.JobResponse;
import com.hirejob.dto.response.PaymentResponse;
import com.hirejob.dto.response.UserResponse;
import com.hirejob.exception.ResourceNotFoundException;
import com.hirejob.model.entity.Job;
import com.hirejob.model.enums.JobStatus;
import com.hirejob.model.enums.Role;
import com.hirejob.repository.JobRepository;
import com.hirejob.repository.PaymentRepository;
import com.hirejob.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final PaymentRepository paymentRepository;
    private final UserService userService;
    private final JobService jobService;
    private final PaymentService paymentService;

    public AdminStatsResponse getPlatformStats() {
        long totalUsers = userRepository.count();
        long totalPosters = userRepository.countByRole(Role.ROLE_POSTER);
        long totalClients = userRepository.countByRole(Role.ROLE_CLIENT);
        long totalActiveJobs = jobRepository.countByStatus(JobStatus.ACTIVE);
        long totalPriorityJobs = jobRepository.countByIsPriorityTrue();
        long totalFlaggedSpamJobs = jobRepository.countByIsFlaggedTrue();
        BigDecimal totalRevenue = paymentRepository.getTotalRevenue();

        return AdminStatsResponse.builder()
                .totalUsers(totalUsers)
                .totalPosters(totalPosters)
                .totalClients(totalClients)
                .totalActiveJobs(totalActiveJobs)
                .totalPriorityJobs(totalPriorityJobs)
                .totalFlaggedSpamJobs(totalFlaggedSpamJobs)
                .totalCompanyRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .build();
    }

    public List<UserResponse> getAllUsers() {
        // Safe mapping: UserResponse never contains passwords
        return userRepository.findAll()
                .stream()
                .map(userService::mapToUserResponse)
                .toList();
    }

    public Page<JobResponse> getAllJobsForModeration(int page, int size) {
        return jobRepository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(jobService::mapToJobResponse);
    }

    @Transactional
    public JobResponse updateJobStatus(Long jobId, JobStatus status) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        job.setStatus(status);
        job = jobRepository.save(job);
        return jobService.mapToJobResponse(job);
    }

    @Transactional
    public JobResponse toggleJobFlag(Long jobId, boolean flagged) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        job.setIsFlagged(flagged);
        job = jobRepository.save(job);
        return jobService.mapToJobResponse(job);
    }

    @Transactional
    public void deleteJob(Long jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        jobRepository.delete(job);
    }

    public List<PaymentResponse> getAllCompanyPayments() {
        return paymentService.getAllPayments();
    }
}

