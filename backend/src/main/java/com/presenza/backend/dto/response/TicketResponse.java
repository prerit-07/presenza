package com.presenza.backend.dto.response;

import com.presenza.backend.entity.Ticket;

public record TicketResponse(
        Long id,
        String name,
        String section,
        String oldDevice,
        String newDevice,
        String reason,
        String status,
        String time
) {
    public static TicketResponse from(Ticket t) {
        String status = t.getStatus().name();
        status = status.charAt(0) + status.substring(1).toLowerCase();
        return new TicketResponse(t.getId(), t.getName(), t.getSection(), t.getOldDevice(),
                t.getNewDevice(), t.getReason(), status, t.getCreatedAt().toString());
    }
}
