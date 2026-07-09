package com.presenza.backend.repository;

import com.presenza.backend.entity.LeaveRequest;
import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByOrganizationOrderByAppliedOnDesc(Organization organization);
    List<LeaveRequest> findByUserOrderByAppliedOnDesc(User user);
}
