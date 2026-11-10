package com.hirejob.service;

import com.hirejob.dto.request.JobApplicationRequest;
import com.hirejob.dto.response.UserResponse;
import com.hirejob.exception.BadRequestException;
import com.hirejob.exception.ResourceNotFoundException;
import com.hirejob.exception.UnauthorizedException;
import com.hirejob.model.entity.Job;
import com.hirejob.model.entity.JobApplication;
import com.hirejob.model.entity.User;
import com.hirejob.model.enums.ApplicationStatus;
import com.hirejob.repository.JobApplicationRepository;
import com.hirejob.repository.JobRepository;
import com.hirejob.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JobApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    public JobApplication applyToJob(JobApplicationRequest request, Long userId) {
        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", request.getJobId()));

        if (job.getPostedBy().getId().equals(userId)) {
            throw new BadRequestException("You cannot apply to your own job");
        }

        if (applicationRepository.existsByJobIdAndApplicantId(request.getJobId(), userId)) {
            throw new BadRequestException("You have already applied to this job");
        }

        User applicant = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        JobApplication application = JobApplication.builder()
                .job(job)
                .applicant(applicant)
                .message(request.getMessage())
                .status(ApplicationStatus.PENDING)
                .build();

        return applicationRepository.save(application);
    }

    public List<Map<String, Object>> getApplicationsByJob(Long jobId, Long userId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (!job.getPostedBy().getId().equals(userId)) {
            throw new UnauthorizedException("You can only view applications for your own jobs");
        }

        return applicationRepository.findByJobId(jobId).stream()
                .map(app -> {
                    User applicant = app.getApplicant();
                    return Map.<String, Object>of(
                            "id", app.getId(),
                            "status", app.getStatus().name(),
                            "message", app.getMessage() != null ? app.getMessage() : "",
                            "createdAt", app.getCreatedAt().toString(),
                            "applicant", UserResponse.builder()
                                    .id(applicant.getId())
                                    .fullName(applicant.getFullName())
                                    .email(applicant.getEmail())
                                    .phone(applicant.getPhone())
                                    .role(applicant.getRole())
                                    .build()
                    );
                }).toList();
    }

    public List<Map<String, Object>> getApplicationsByUser(Long userId) {
        return applicationRepository.findByApplicantId(userId).stream()
                .map(app -> {
                    Job job = app.getJob();
                    return Map.<String, Object>of(
                            "id", app.getId(),
                            "status", app.getStatus().name(),
                            "message", app.getMessage() != null ? app.getMessage() : "",
                            "createdAt", app.getCreatedAt().toString(),
                            "jobId", job.getId(),
                            "jobTitle", job.getTitle(),
                            "jobLocation", job.getLocation() != null ? job.getLocation() : ""
                    );
                }).toList();
    }

    public void updateApplicationStatus(Long applicationId, ApplicationStatus status, Long userId) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        if (!application.getJob().getPostedBy().getId().equals(userId)) {
            throw new UnauthorizedException("Only the job poster can update application status");
        }

        application.setStatus(status);
        applicationRepository.save(application);
    }
}

