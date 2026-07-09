package com.presenza.backend.service;

import com.presenza.backend.dto.request.BulkIdsStatusRequest;
import com.presenza.backend.dto.request.LeaveRequestCreateRequest;
import com.presenza.backend.dto.request.StatusUpdateRequest;
import com.presenza.backend.dto.response.BulkStatusResult;
import com.presenza.backend.dto.response.LeaveRequestResponse;
import com.presenza.backend.entity.*;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.ActivityLogRepository;
import com.presenza.backend.repository.LeaveRequestRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final ActivityLogRepository activityLogRepository;
    private final CurrentUser currentUser;

    public List<LeaveRequestResponse> listForOrganization() {
        Organization org = currentUser.get().getOrganization();
        return leaveRequestRepository.findByOrganizationOrderByAppliedOnDesc(org).stream()
                .map(LeaveRequestResponse::from).toList();
    }

    public List<LeaveRequestResponse> listForCurrentUser() {
        User user = currentUser.get();
        return leaveRequestRepository.findByUserOrderByAppliedOnDesc(user).stream()
                .map(LeaveRequestResponse::from).toList();
    }

    @Transactional
    public LeaveRequestResponse submit(LeaveRequestCreateRequest req) {
        User user = currentUser.get();
        LeaveRequest leave = LeaveRequest.builder()
                .user(user).organization(user.getOrganization())
                .name(user.getName()).role(user.getTitle() != null ? user.getTitle() : user.getRole().name())
                .fromDate(req.getFromDate()).toDate(req.getToDate()).reason(req.getReason()).build();
        leave = leaveRequestRepository.save(leave);
        activityLogRepository.save(ActivityLog.builder().organization(user.getOrganization())
                .text(user.getName() + " requested leave").build());
        return LeaveRequestResponse.from(leave);
    }

    @Transactional
    public LeaveRequestResponse updateStatus(Long id, StatusUpdateRequest req) {
        LeaveRequest leave = leaveRequestRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Leave request not found."));
        Organization org = currentUser.get().getOrganization();
        if (!leave.getOrganization().getId().equals(org.getId())) {
            throw ApiException.forbidden("Not your organization's leave request.");
        }
        RequestStatus status = RequestStatus.valueOf(req.getStatus().trim().toUpperCase());
        leave.setStatus(status);
        leave = leaveRequestRepository.save(leave);
        activityLogRepository.save(ActivityLog.builder().organization(org)
                .text(leave.getName() + "'s leave request was " + status.name().toLowerCase()).build());
        return LeaveRequestResponse.from(leave);
    }

    @Transactional
    public BulkStatusResult bulkUpdateStatus(BulkIdsStatusRequest req) {
        int updated = 0;
        List<String> errors = new ArrayList<>();
        StatusUpdateRequest single = new StatusUpdateRequest();
        single.setStatus(req.getStatus());
        for (Long id : req.getIds()) {
            try {
                updateStatus(id, single);
                updated++;
            } catch (ApiException e) {
                errors.add("Request " + id + ": " + e.getMessage());
            }
        }
        return new BulkStatusResult(updated, errors);
    }
}
