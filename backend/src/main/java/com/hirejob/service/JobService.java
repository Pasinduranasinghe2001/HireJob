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
import com.hirejob.security.PhoneNormalizer;
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
import java.util.*;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final MlSpamFilterService mlSpamFilterService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    // Dictionary for Sri Lanka Services typo & prefix fuzzy matching
    private static final Map<String, List<String>> CANONICAL_SERVICES = Map.ofEntries(
            Map.entry("cleaning", List.of("celaning", "clea", "leaning", "clen", "clenning", "clean", "cleaner", "housekeeper", "maid")),
            Map.entry("plumbing", List.of("plubing", "plumb", "plumbin", "plumber", "pulmbing", "pipe", "leak")),
            Map.entry("electrical", List.of("electrian", "elect", "electical", "electrician", "electric", "wiring")),
            Map.entry("carpentry", List.of("carpinter", "carpen", "carpenter", "carpanter", "woodwork")),
            Map.entry("masonry", List.of("masan", "masn", "mason", "masonary", "bricklaying", "plastering")),
            Map.entry("painting", List.of("paintr", "paintin", "painter", "paniting")),
            Map.entry("gardening", List.of("gardn", "gardning", "gardener", "gradening", "lawn")),
            Map.entry("mechanic", List.of("mechnic", "machanic", "auto mechanic", "vehicle repair")),
            Map.entry("transport", List.of("transpot", "trnsport", "driver", "drver", "delivery", "mover")),
            Map.entry("welding", List.of("weldr", "welden", "welder", "wellding")),
            Map.entry("catering", List.of("catring", "caterer", "cook", "cooking")),
            Map.entry("tailoring", List.of("tailor", "sewing", "tailer", "dressmaking"))
    );

    public static int calculateLevenshtein(String s1, String s2) {
        if (s1 == null || s2 == null) return Integer.MAX_VALUE;
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        for (int i = 0; i <= s1.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= s2.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        return dp[s1.length()][s2.length()];
    }

    /**
     * Resolves fuzzy typos (e.g., 'celaning', 'clea', 'leaning' -> 'cleaning')
     */
    public String fuzzyNormalizeKeyword(String raw) {
        if (raw == null || raw.trim().isEmpty()) return null;
        String q = raw.trim().toLowerCase();

        for (Map.Entry<String, List<String>> entry : CANONICAL_SERVICES.entrySet()) {
            String canonical = entry.getKey();
            if (canonical.equals(q) || canonical.startsWith(q) || canonical.contains(q)) {
                return canonical;
            }
            for (String trig : entry.getValue()) {
                if (trig.equals(q) || trig.startsWith(q) || trig.contains(q)) {
                    return canonical;
                }
                if (q.length() >= 3 && calculateLevenshtein(q, trig) <= 2) {
                    return canonical;
                }
            }
            if (q.length() >= 4 && calculateLevenshtein(q, canonical) <= 2) {
                return canonical;
            }
        }
        return null;
    }

    public JobResponse createJob(JobRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (request.getLocation() == null || request.getLocation().isBlank()) {
            throw new BadRequestException("Location / District is required for client identification");
        }
        if (request.getDescription() == null || request.getDescription().isBlank()) {
            throw new BadRequestException("Service description is required");
        }

        String resolvedPhone = (request.getContactPhone() != null && !request.getContactPhone().isBlank())
                ? request.getContactPhone().trim()
                : (user.getPhone() != null ? user.getPhone().trim() : "");
        if (resolvedPhone.isBlank()) {
            throw new BadRequestException("A contact phone number is required for client identification");
        }
        String normalizedPhone = PhoneNormalizer.normalizeForStorage(resolvedPhone);
        if (user.getPhone() == null || user.getPhone().isBlank()) {
            user.setPhone(normalizedPhone);
            user = userRepository.save(user);
        }

        java.time.LocalDateTime expiresAt = null;
        if (request.getDurationDays() != null && request.getDurationDays() > 0) {
            expiresAt = java.time.LocalDateTime.now().plusDays(request.getDurationDays());
        }

        MlSpamFilterService.SpamCheckResult spamResult = mlSpamFilterService.analyze(
                request.getTitle(), request.getDescription()
        );

        Job job = Job.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .jobType(request.getJobType())
                .category(request.getCategory())
                .location(request.getLocation().trim())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .salaryMin(request.getSalaryMin())
                .salaryMax(request.getSalaryMax())
                .durationDays(request.getDurationDays())
                .expiresAt(expiresAt)
                .contactPhone(normalizedPhone)
                .contactWhatsapp(request.getContactWhatsapp())
                .contactEmail(request.getContactEmail() != null && !request.getContactEmail().isBlank() ? request.getContactEmail().trim() : user.getEmail())
                .spamScore(spamResult.getScore())
                .isFlagged(spamResult.isFlagged())
                .isPriority(false)
                .viewsCount(0)
                .postedBy(user)
                .status(JobStatus.ACTIVE)
                .build();

        job = jobRepository.save(job);
        return mapToJobResponse(job);
    }

    public Page<JobResponse> getAllJobs(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Job> jobs = jobRepository.findActiveJobsWithPriority(pageable);
        return jobs.map(this::mapToJobResponse);
    }

    public JobResponse getJobById(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));
        job.setViewsCount((job.getViewsCount() == null ? 0 : job.getViewsCount()) + 1);
        jobRepository.save(job);
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
                // ignore invalid type
            }
        }

        // Location default logic: if empty, or Entire Sri Lanka, set to null to query entire country
        String normalizedLocation = location;
        if (normalizedLocation != null) {
            String trimmedLoc = normalizedLocation.trim().toLowerCase();
            if (trimmedLoc.isEmpty() || trimmedLoc.contains("entire") || trimmedLoc.equals("sri lanka") || trimmedLoc.equals("all")) {
                normalizedLocation = null;
            } else {
                normalizedLocation = normalizedLocation.trim();
            }
        }

        // Fuzzy match keyword: e.g. "celaning", "clea", "leaning" -> "cleaning"
        String altKeyword = null;
        if (keyword != null && !keyword.trim().isEmpty()) {
            altKeyword = fuzzyNormalizeKeyword(keyword);
        }

        Page<Job> jobs = jobRepository.searchJobs(
                keyword != null && !keyword.isBlank() ? keyword.trim() : null,
                altKeyword,
                normalizedLocation,
                jobType,
                pageable
        );
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
        List<String> urls = uploadImages(jobId, List.of(file), userId);
        return urls.isEmpty() ? null : urls.get(0);
    }

    public List<String> uploadImages(Long jobId, List<MultipartFile> files, Long userId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (!job.getPostedBy().getId().equals(userId)) {
            throw new UnauthorizedException("You can only upload images to your own jobs");
        }

        if (files == null || files.isEmpty()) {
            throw new BadRequestException("No files provided");
        }

        if (files.size() > 5) {
            throw new BadRequestException("You can upload a maximum of 5 photos per post");
        }

        List<String> uploadedUrls = new ArrayList<>();
        try {
            Path uploadPath = Paths.get(uploadDir, "jobs");
            Files.createDirectories(uploadPath);

            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                String contentType = file.getContentType();
                if (contentType == null || !contentType.startsWith("image/")) {
                    throw new BadRequestException("Only image files are allowed");
                }

                String originalFilename = file.getOriginalFilename();
                String extension = "";
                if (originalFilename != null && originalFilename.contains(".")) {
                    extension = originalFilename.substring(originalFilename.lastIndexOf("."));
                }
                String filename = UUID.randomUUID() + extension;
                Path filePath = uploadPath.resolve(filename);
                Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                uploadedUrls.add("/uploads/jobs/" + filename);

                if (uploadedUrls.size() >= 5) break;
            }

            if (!uploadedUrls.isEmpty()) {
                job.setImageUrl(uploadedUrls.get(0));
                job.setImageUrls(String.join(",", uploadedUrls));
                jobRepository.save(job);
            }

            return uploadedUrls;
        } catch (IOException e) {
            throw new BadRequestException("Failed to upload image: " + e.getMessage());
        }
    }

    public JobResponse upgradeToPriority(Long jobId, int days, Long userId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (!job.getPostedBy().getId().equals(userId)) {
            throw new UnauthorizedException("You can only promote your own listings");
        }

        job.setIsPriority(true);
        job.setPriorityExpiresAt(java.time.LocalDateTime.now().plusDays(days));
        job = jobRepository.save(job);
        return mapToJobResponse(job);
    }

    public JobResponse mapToJobResponse(Job job) {
        User poster = job.getPostedBy();

        List<String> imgList = new ArrayList<>();
        if (job.getImageUrls() != null && !job.getImageUrls().isBlank()) {
            for (String s : job.getImageUrls().split(",")) {
                if (!s.isBlank()) imgList.add(s.trim());
            }
        } else if (job.getImageUrl() != null && !job.getImageUrl().isBlank()) {
            imgList.add(job.getImageUrl().trim());
        }

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
                .imageUrls(imgList)
                .durationDays(job.getDurationDays())
                .expiresAt(job.getExpiresAt())
                .isPriority(job.getIsPriority() != null && job.getIsPriority())
                .priorityExpiresAt(job.getPriorityExpiresAt())
                .contactPhone(job.getContactPhone())
                .contactWhatsapp(job.getContactWhatsapp())
                .contactEmail(job.getContactEmail())
                .viewsCount(job.getViewsCount() != null ? job.getViewsCount() : 0)
                .spamScore(job.getSpamScore() != null ? job.getSpamScore() : 0.0)
                .isFlagged(job.getIsFlagged() != null && job.getIsFlagged())
                .status(job.getStatus())
                .postedBy(UserResponse.builder()
                        .id(poster.getId())
                        .fullName(poster.getFullName())
                        .email(poster.getEmail())
                        .phone(poster.getPhone())
                        .avatarUrl(poster.getAvatarUrl())
                        .role(poster.getRole())
                        .emailVerified(poster.getEmailVerified())
                        .twoFactorEnabled(poster.getTwoFactorEnabled())
                        .createdAt(poster.getCreatedAt())
                        .build())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }
}
