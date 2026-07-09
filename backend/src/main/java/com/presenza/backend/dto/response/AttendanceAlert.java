package com.presenza.backend.dto.response;

public record AttendanceAlert(
        Long userId,
        String name,
        String title,
        String type,
        String detail
) {
}
