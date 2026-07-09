package com.presenza.backend.dto.response;

import com.presenza.backend.entity.User;

public record TimetableEntryResponse(
        Long userId,
        String name,
        String title,
        Long shiftId,
        String shiftName,
        String startTime,
        String endTime,
        String days
) {
    public static TimetableEntryResponse from(User u) {
        boolean hasShift = u.getShift() != null;
        return new TimetableEntryResponse(
                u.getId(), u.getName(), u.getTitle() != null ? u.getTitle() : u.getRole().name(),
                hasShift ? u.getShift().getId() : null,
                hasShift ? u.getShift().getName() : "Unassigned",
                hasShift ? u.getShift().getStartTime().toString() : null,
                hasShift ? u.getShift().getEndTime().toString() : null,
                hasShift ? u.getShift().getDays() : null
        );
    }
}
