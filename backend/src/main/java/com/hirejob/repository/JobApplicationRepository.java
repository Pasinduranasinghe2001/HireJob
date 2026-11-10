package com.hirejob.repository;

import com.hirejob.model.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    List<JobApplication> findByJobId(Long jobId);

    List<JobApplication> findByApplicantId(Long applicantId);

    boolean existsByJobIdAndApplicantId(Long jobId, Long applicantId);
}
