package com.presenza.backend.dto.response;

import com.presenza.backend.entity.Shift;

public record ShiftResponse(
        Long id,
        String name,
        String startTime,
        String endTime,
        String days,
        Integer graceMinutes,
        Integer assignedCount
) {
    public static ShiftResponse from(Shift s, int assignedCount) {
        return new ShiftResponse(
                s.getId(), s.getName(),
                s.getStartTime().toString(), s.getEndTime().toString(),
                s.getDays(), s.getGraceMinutes(), assignedCount
        );
    }
}
