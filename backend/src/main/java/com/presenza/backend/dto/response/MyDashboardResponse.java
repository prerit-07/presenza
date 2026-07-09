package com.presenza.backend.dto.response;

public record MyDashboardResponse(
        int attendancePercent,
        int dayStreak,
        int leavesRemaining,
        int leavesEntitled,
        String verificationMode,
        String shiftName,
        String shiftStart,
        String shiftEnd,
        String shiftDays
) {
}
