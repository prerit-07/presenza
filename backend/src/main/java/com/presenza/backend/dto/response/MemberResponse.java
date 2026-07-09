package com.presenza.backend.dto.response;

import com.presenza.backend.entity.User;

public record MemberResponse(
        Long id,
        String name,
        String email,
        String joinedVia,
        String status,
        String role,
        Integer attendance,
        Long shiftId,
        String shiftName
) {
    public static MemberResponse from(User u) {
        return new MemberResponse(
                u.getId(), u.getName(), u.getEmail(), u.getJoinedVia(),
                u.getStatus().name().equals("ACTIVE") ? "Active" : "Inactive",
                u.getTitle() != null ? u.getTitle() : u.getRole().name(),
                u.getAttendancePercent(),
                u.getShift() != null ? u.getShift().getId() : null,
                u.getShift() != null ? u.getShift().getName() : "Unassigned"
        );
    }
}
