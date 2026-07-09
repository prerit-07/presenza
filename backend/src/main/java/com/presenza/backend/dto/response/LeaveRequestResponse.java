package com.presenza.backend.dto.response;

import com.presenza.backend.entity.LeaveRequest;

public record LeaveRequestResponse(
        Long id,
        String name,
        String role,
        String from,
        String to,
        String reason,
        String status,
        String appliedOn
) {
    public static LeaveRequestResponse from(LeaveRequest r) {
        return new LeaveRequestResponse(
                r.getId(), r.getName(), r.getRole(),
                r.getFromDate() != null ? r.getFromDate().toString() : null,
                r.getToDate() != null ? r.getToDate().toString() : null,
                r.getReason(), capitalize(r.getStatus().name()), r.getAppliedOn().toString()
        );
    }

    private static String capitalize(String s) {
        return s.charAt(0) + s.substring(1).toLowerCase();
    }
}
