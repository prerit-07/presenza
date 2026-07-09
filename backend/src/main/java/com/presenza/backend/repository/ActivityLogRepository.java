package com.presenza.backend.repository;

import com.presenza.backend.entity.ActivityLog;
import com.presenza.backend.entity.Organization;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByOrganizationOrderByCreatedAtDesc(Organization organization, Pageable pageable);
}
