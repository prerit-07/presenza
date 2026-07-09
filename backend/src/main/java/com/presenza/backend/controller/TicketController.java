package com.presenza.backend.controller;

import com.presenza.backend.dto.request.BulkIdsStatusRequest;
import com.presenza.backend.dto.request.StatusUpdateRequest;
import com.presenza.backend.dto.request.TicketCreateRequest;
import com.presenza.backend.dto.response.BulkStatusResult;
import com.presenza.backend.dto.response.TicketResponse;
import com.presenza.backend.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public List<TicketResponse> list() {
        return ticketService.list();
    }

    @PostMapping
    public TicketResponse create(@Valid @RequestBody TicketCreateRequest req) {
        return ticketService.create(req);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public TicketResponse updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest req) {
        return ticketService.updateStatus(id, req);
    }

    @PatchMapping("/bulk-status")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public BulkStatusResult bulkUpdateStatus(@Valid @RequestBody BulkIdsStatusRequest req) {
        return ticketService.bulkUpdateStatus(req);
    }
}
