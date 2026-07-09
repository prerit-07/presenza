package com.presenza.backend.dto.response;

import com.presenza.backend.entity.AttendanceRecord;

public record AttendanceResponse(
        Long id,
        String name,
        String checkIn,
        String checkOut,
        String zone,
        String status,
        String date
) {
    public static AttendanceResponse from(AttendanceRecord r) {
        String status = r.getStatus().name().replace("_", " ");
        status = status.charAt(0) + status.substring(1).toLowerCase();
        return new AttendanceResponse(
                r.getId(),
                r.getUser().getName(),
                r.getCheckIn() != null ? r.getCheckIn().toString() : "-",
                r.getCheckOut() != null ? r.getCheckOut().toString() : "-",
                r.getZone() != null ? r.getZone() : "-",
                status,
                r.getDate().toString()
        );
    }
}
