package com.hirejob.service;

import com.hirejob.dto.request.AdminUserUpdateRequest;
import com.hirejob.dto.request.CreateTeamUserRequest;
import com.hirejob.dto.request.PlatformSettingRequest;
import com.hirejob.dto.response.*;
import com.hirejob.exception.BadRequestException;
import com.hirejob.exception.ResourceNotFoundException;
import com.hirejob.model.entity.*;
import com.hirejob.model.enums.JobStatus;
import com.hirejob.model.enums.Role;
import com.hirejob.repository.*;
import com.hirejob.security.GoogleTokenVerifier;
import com.hirejob.security.PhoneNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository applicationRepository;
    private final ReviewRepository reviewRepository;
    private final PaymentRepository paymentRepository;
    private final PlatformSettingRepository settingRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;
    private final JobService jobService;
    private final PaymentService paymentService;
    private final EmailService emailService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AdminStatsResponse getPlatformStats() {
        long totalUsers = userRepository.count();
        long totalPosters = userRepository.countByRole(Role.ROLE_POSTER);
        long totalClients = userRepository.countByRole(Role.ROLE_CLIENT);
        long totalAdmins = userRepository.countByRole(Role.ROLE_ADMIN);
        long totalActiveJobs = jobRepository.countByStatus(JobStatus.ACTIVE);
        long totalPriorityJobs = jobRepository.countByIsPriorityTrue();
        long totalFlaggedSpamJobs = jobRepository.countByIsFlaggedTrue();
        long totalApplications = applicationRepository.count();
        BigDecimal totalRevenue = paymentRepository.getTotalRevenue();

        return AdminStatsResponse.builder()
                .totalUsers(totalUsers)
                .totalPosters(totalPosters)
                .totalClients(totalClients)
                .totalAdmins(totalAdmins)
                .totalActiveJobs(totalActiveJobs)
                .totalPriorityJobs(totalPriorityJobs)
                .totalFlaggedSpamJobs(totalFlaggedSpamJobs)
                .totalApplications(totalApplications)
                .totalCompanyRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .build();
    }

    public List<UserResponse> getAllUsers() {
        // UserResponse omits passwords entirely (BCrypt hashes remain strictly protected)
        return userRepository.findAll(Sort.by("createdAt").descending())
                .stream()
                .map(userService::mapToUserResponse)
                .toList();
    }

    @Transactional
    public UserResponse createTeamMember(CreateTeamUserRequest request) {
        String email = AuthService.normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email already exists.");
        }

        String normalizedPhone = PhoneNormalizer.normalizeForStorage(request.getPhone());
        if (!normalizedPhone.isEmpty()
                && userRepository.existsByPhoneIn(PhoneNormalizer.candidates(normalizedPhone))) {
            throw new BadRequestException("An account with this phone number already exists.");
        }

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .phone(normalizedPhone.isEmpty() ? null : normalizedPhone)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .emailVerified(true)
                .twoFactorEnabled(false)
                .active(true)
                .build();

        user = userRepository.save(user);
        return userService.mapToUserResponse(user);
    }

    @Transactional
    public UserResponse updateUser(Long targetUserId, AdminUserUpdateRequest request, Long currentAdminId) {
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        if (targetUserId.equals(currentAdminId)) {
            if (request.getRole() != null && request.getRole() != Role.ROLE_ADMIN) {
                throw new BadRequestException("You cannot demote your own administrator account.");
            }
            if (Boolean.FALSE.equals(request.getActive())) {
                throw new BadRequestException("You cannot suspend your own administrator account.");
            }
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            target.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            String normalizedPhone = PhoneNormalizer.normalizeForStorage(request.getPhone());
            target.setPhone(normalizedPhone.isEmpty() ? null : normalizedPhone);
        }
        if (request.getRole() != null) {
            target.setRole(request.getRole());
        }
        if (request.getEmailVerified() != null) {
            target.setEmailVerified(request.getEmailVerified());
        }
        if (request.getActive() != null) {
            target.setActive(request.getActive());
            if (!request.getActive()) {
                // Immediately revoke active tokens of suspended accounts
                target.setTokenVersion(target.getTokenVersion() == null ? 1 : target.getTokenVersion() + 1);
            }
        }

        target = userRepository.save(target);
        return userService.mapToUserResponse(target);
    }

    @Transactional
    public void deleteUser(Long targetUserId, Long currentAdminId) {
        if (targetUserId.equals(currentAdminId)) {
            throw new BadRequestException("You cannot delete your own currently signed-in account.");
        }
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        if (!paymentRepository.findByUserIdOrderByCreatedAtDesc(targetUserId).isEmpty()) {
            throw new BadRequestException("This user has payment transactions. Please suspend the account instead of deleting it to preserve financial audit records.");
        }

        // Remove reviews, applications, and posted jobs belonging to this user safely
        reviewRepository.deleteAll(reviewRepository.findByReviewerId(targetUserId));
        reviewRepository.deleteAll(reviewRepository.findByRevieweeId(targetUserId));
        applicationRepository.deleteAll(applicationRepository.findByApplicantId(targetUserId));
        List<Job> userJobs = jobRepository.findByPostedById(targetUserId);
        for (Job job : userJobs) {
            deleteJob(job.getId());
        }
        userRepository.delete(target);
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
    public JobResponse setJobPriority(Long jobId, boolean priority, int days) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        job.setIsPriority(priority);
        job.setPriorityExpiresAt(priority ? LocalDateTime.now().plusDays(Math.max(1, days)) : null);
        job = jobRepository.save(job);
        return jobService.mapToJobResponse(job);
    }

    @Transactional
    public void deleteJob(Long jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        if (!paymentRepository.findByJobId(jobId).isEmpty()) {
            // Preserve payment ledger FK by closing the listing cleanly instead of hard-deleting
            job.setStatus(JobStatus.CLOSED);
            job.setIsPriority(false);
            jobRepository.save(job);
            return;
        }
        applicationRepository.deleteAll(applicationRepository.findByJobId(jobId));
        reviewRepository.deleteAll(reviewRepository.findByJobId(jobId));
        jobRepository.delete(job);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllPlatformTasks() {
        return applicationRepository.findAll(Sort.by("createdAt").descending())
                .stream()
                .limit(100)
                .map(app -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", app.getId());
                    item.put("jobId", app.getJob().getId());
                    item.put("jobTitle", app.getJob().getTitle());
                    item.put("category", app.getJob().getCategory());
                    item.put("providerName", app.getJob().getPostedBy().getFullName());
                    item.put("applicantName", app.getApplicant().getFullName());
                    item.put("applicantEmail", app.getApplicant().getEmail());
                    item.put("message", app.getMessage());
                    item.put("status", app.getStatus().name());
                    item.put("createdAt", app.getCreatedAt());
                    return item;
                })
                .toList();
    }

    public List<PaymentResponse> getAllCompanyPayments() {
        return paymentService.getAllPayments();
    }

    @Transactional
    public PlatformSetting getOrCreateSettings() {
        return settingRepository.findById(1L).orElseGet(() ->
                settingRepository.save(PlatformSetting.builder().id(1L).build()));
    }

    @Transactional
    public PlatformSetting updateSettings(PlatformSettingRequest request, String adminEmail) {
        PlatformSetting s = getOrCreateSettings();
        s.setSiteName(request.getSiteName().trim());
        s.setSupportEmail(request.getSupportEmail().trim());
        if (request.getRegistrationEnabled() != null) s.setRegistrationEnabled(request.getRegistrationEnabled());
        if (request.getRequireEmailVerification() != null) s.setRequireEmailVerification(request.getRequireEmailVerification());
        if (request.getAllowAnonymousBrowsing() != null) s.setAllowAnonymousBrowsing(request.getAllowAnonymousBrowsing());
        if (request.getSpamFlagThreshold() != null) s.setSpamFlagThreshold(request.getSpamFlagThreshold());
        if (request.getPriorityPrice1Day() != null) s.setPriorityPrice1Day(request.getPriorityPrice1Day());
        if (request.getPriorityPrice3Day() != null) s.setPriorityPrice3Day(request.getPriorityPrice3Day());
        if (request.getPriorityPrice7Day() != null) s.setPriorityPrice7Day(request.getPriorityPrice7Day());
        s.setSiteAnnouncement(request.getSiteAnnouncement() == null ? null : request.getSiteAnnouncement().trim());
        s.setUpdatedBy(adminEmail);
        return settingRepository.save(s);
    }

    public Map<String, Object> getSystemDiagnostics() {
        return Map.of(
                "emailProvider", emailService.getActiveProvider(),
                "emailConfigured", emailService.isConfigured(),
                "googleSignInConfigured", googleTokenVerifier.isConfigured(),
                "passwordsProtected", true
        );
    }
}
