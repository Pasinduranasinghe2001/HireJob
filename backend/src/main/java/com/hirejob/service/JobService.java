package com.hirejob.service;

import com.hirejob.dto.request.JobRequest;
import com.hirejob.dto.response.JobResponse;
import com.hirejob.dto.response.UserResponse;
import com.hirejob.exception.BadRequestException;
import com.hirejob.exception.ResourceNotFoundException;
import com.hirejob.exception.UnauthorizedException;
import com.hirejob.model.entity.Job;
import com.hirejob.model.entity.User;
import com.hirejob.model.enums.JobStatus;
import com.hirejob.model.enums.JobType;
import com.hirejob.repository.JobRepository;
import com.hirejob.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public JobResponse createJob(JobRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Job job = Job.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .jobType(request.getJobType())
                .category(request.getCategory())
                .location(request.getLocation())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .salaryMin(request.getSalaryMin())
                .salaryMax(request.getSalaryMax())
                .postedBy(user)
                .status(JobStatus.ACTIVE)
                .build();

        job = jobRepository.save(job);
        return mapToJobResponse(job);
    }

    public Page<JobResponse> getAllJobs(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Job> jobs = jobRepository.findByStatus(JobStatus.ACTIVE, pageable);
        return jobs.map(this::mapToJobResponse);
    }

    public JobResponse getJobById(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));
        return mapToJobResponse(job);
    }

    public List<JobResponse> getJobsByUser(Long userId) {
        return jobRepository.findByPostedById(userId)
                .stream()
                .map(this::mapToJobResponse)
                .toList();
    }

    public Page<JobResponse> searchJobs(String keyword, String location, String type, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        JobType jobType = null;
        if (type != null && !type.isEmpty() && !type.equalsIgnoreCase("ALL")) {
            try {
                jobType = JobType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                // ignore invalid type, search without filter
            }
        }
        Page<Job> jobs = jobRepository.searchJobs(keyword, location, jobType, pageable);
        return jobs.map(this::mapToJobResponse);
    }

    public JobResponse updateJob(Long id, JobRequest request, Long userId) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));

        if (!job.getPostedBy().getId().equals(userId)) {
            throw new UnauthorizedException("You can only update your own jobs");
        }

        job.setTitle(request.getTitle());
        job.setDescription(request.getDescription());
        job.setJobType(request.getJobType());
        job.setCategory(request.getCategory());
        job.setLocation(request.getLocation());
        job.setLatitude(request.getLatitude());
        job.setLongitude(request.getLongitude());
        job.setSalaryMin(request.getSalaryMin());
        job.setSalaryMax(request.getSalaryMax());

        job = jobRepository.save(job);
        return mapToJobResponse(job);
    }

    public void deleteJob(Long id, Long userId) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));

        if (!job.getPostedBy().getId().equals(userId)) {
            throw new UnauthorizedException("You can only delete your own jobs");
        }

        jobRepository.delete(job);
    }

    public String uploadImage(Long jobId, MultipartFile file, Long userId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (!job.getPostedBy().getId().equals(userId)) {
            throw new UnauthorizedException("You can only upload images to your own jobs");
        }

        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("Only image files are allowed");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID() + extension;

            Path uploadPath = Paths.get(uploadDir, "jobs");
            Files.createDirectories(uploadPath);
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String imageUrl = "/uploads/jobs/" + filename;
            job.setImageUrl(imageUrl);
            jobRepository.save(job);

            return imageUrl;
        } catch (IOException e) {
            throw new BadRequestException("Failed to upload image: " + e.getMessage());
        }
    }

    private JobResponse mapToJobResponse(Job job) {
        User poster = job.getPostedBy();
        return JobResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .jobType(job.getJobType())
                .category(job.getCategory())
                .location(job.getLocation())
                .latitude(job.getLatitude())
                .longitude(job.getLongitude())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .imageUrl(job.getImageUrl())
                .status(job.getStatus())
                .postedBy(UserResponse.builder()
                        .id(poster.getId())
                        .fullName(poster.getFullName())
                        .email(poster.getEmail())
                        .phone(poster.getPhone())
                        .avatarUrl(poster.getAvatarUrl())
                        .role(poster.getRole())
                        .createdAt(poster.getCreatedAt())
                        .build())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }
}

