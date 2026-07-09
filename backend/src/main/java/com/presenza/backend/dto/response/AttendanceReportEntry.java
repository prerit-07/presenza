package com.presenza.backend.dto.response;

public record AttendanceReportEntry(
        Long userId,
        String name,
        String title,
        long presentDays,
        long lateDays,
        long onLeaveDays,
        long absentDays,
        long workingDays,
        double attendanceRate
) {
}
