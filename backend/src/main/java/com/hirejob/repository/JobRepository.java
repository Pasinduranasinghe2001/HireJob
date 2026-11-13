package com.hirejob.repository;

import com.hirejob.model.entity.Job;
import com.hirejob.model.enums.JobStatus;
import com.hirejob.model.enums.JobType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByPostedById(Long userId);

    List<Job> findByStatus(JobStatus status);

    List<Job> findByLocationContainingIgnoreCase(String location);

    @Query("SELECT j FROM Job j WHERE " +
           "(:keyword IS NULL " +
           " OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           " OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           " OR LOWER(j.category) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           " OR (:altKeyword IS NOT NULL AND (" +
           "     LOWER(j.title) LIKE LOWER(CONCAT('%', :altKeyword, '%')) " +
           "     OR LOWER(j.description) LIKE LOWER(CONCAT('%', :altKeyword, '%')) " +
           "     OR LOWER(j.category) LIKE LOWER(CONCAT('%', :altKeyword, '%'))" +
           "    ))) " +
           "AND (:location IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%'))) " +
           "AND (:jobType IS NULL OR j.jobType = :jobType) " +
           "AND j.status = 'ACTIVE' " +
           "AND (j.expiresAt IS NULL OR j.expiresAt > CURRENT_TIMESTAMP) " +
           "ORDER BY j.isPriority DESC, j.createdAt DESC")
    Page<Job> searchJobs(@Param("keyword") String keyword,
                         @Param("altKeyword") String altKeyword,
                         @Param("location") String location,
                         @Param("jobType") JobType jobType,
                         Pageable pageable);

    @Query("SELECT j FROM Job j WHERE j.status = 'ACTIVE' " +
           "AND (j.expiresAt IS NULL OR j.expiresAt > CURRENT_TIMESTAMP) " +
           "ORDER BY j.isPriority DESC, j.createdAt DESC")
    Page<Job> findActiveJobsWithPriority(Pageable pageable);

    long countByStatus(JobStatus status);

    long countByIsPriorityTrue();

    long countByIsFlaggedTrue();
}
