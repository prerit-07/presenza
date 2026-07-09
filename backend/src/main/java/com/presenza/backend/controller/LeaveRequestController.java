package com.presenza.backend.controller;

import com.presenza.backend.dto.request.BulkIdsStatusRequest;
import com.presenza.backend.dto.request.LeaveRequestCreateRequest;
import com.presenza.backend.dto.request.StatusUpdateRequest;
import com.presenza.backend.dto.response.BulkStatusResult;
import com.presenza.backend.dto.response.LeaveRequestResponse;
import com.presenza.backend.service.LeaveRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leave-requests")
@RequiredArgsConstructor
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public List<LeaveRequestResponse> list() {
        return leaveRequestService.listForOrganization();
    }

    @GetMapping("/me")
    public List<LeaveRequestResponse> myLeaveRequests() {
        return leaveRequestService.listForCurrentUser();
    }

    @PostMapping
    public LeaveRequestResponse submit(@Valid @RequestBody LeaveRequestCreateRequest req) {
        return leaveRequestService.submit(req);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public LeaveRequestResponse updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest req) {
        return leaveRequestService.updateStatus(id, req);
    }

    @PatchMapping("/bulk-status")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public BulkStatusResult bulkUpdateStatus(@Valid @RequestBody BulkIdsStatusRequest req) {
        return leaveRequestService.bulkUpdateStatus(req);
    }
}
