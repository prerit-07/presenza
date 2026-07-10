package com.presenza.backend.service;

import com.presenza.backend.dto.request.BulkIdsStatusRequest;
import com.presenza.backend.dto.request.StatusUpdateRequest;
import com.presenza.backend.dto.request.TicketCreateRequest;
import com.presenza.backend.dto.response.BulkStatusResult;
import com.presenza.backend.dto.response.TicketResponse;
import com.presenza.backend.entity.*;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.ActivityLogRepository;
import com.presenza.backend.repository.TicketRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final ActivityLogRepository activityLogRepository;
    private final CurrentUser currentUser;

    public List<TicketResponse> list() {
        Organization org = currentUser.get().getOrganization();
        return ticketRepository.findByOrganizationOrderByCreatedAtDesc(org).stream()
                .map(TicketResponse::from).toList();
    }

    @Transactional
    public TicketResponse create(TicketCreateRequest req) {
        User user = currentUser.get();
        Ticket ticket = Ticket.builder()
                .user(user).organization(user.getOrganization()).name(user.getName())
                .section(req.getSection()).oldDevice(req.getOldDevice()).newDevice(req.getNewDevice())
                .reason(req.getReason()).build();
        ticket = ticketRepository.save(ticket);
        activityLogRepository.save(ActivityLog.builder().organization(user.getOrganization())
                .text(user.getName() + " submitted a device change ticket").build());
        return TicketResponse.from(ticket);
    }

    @Transactional
    public TicketResponse updateStatus(Long id, StatusUpdateRequest req) {
        Ticket ticket = ticketRepository.findById(id).orElseThrow(() -> ApiException.notFound("Ticket not found."));
        Organization org = currentUser.get().getOrganization();
        if (!ticket.getOrganization().getId().equals(org.getId())) {
            throw ApiException.forbidden("Not your organization's ticket.");
        }
        TicketStatus status = TicketStatus.valueOf(req.getStatus().trim().toUpperCase());
        ticket.setStatus(status);
        return TicketResponse.from(ticketRepository.save(ticket));
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
                errors.add("Ticket " + id + ": " + e.getMessage());
            }
        }
        return new BulkStatusResult(updated, errors);
    }
}
