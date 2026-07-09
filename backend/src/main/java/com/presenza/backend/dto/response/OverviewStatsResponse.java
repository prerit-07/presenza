package com.presenza.backend.dto.response;

import lombok.Builder;

@Builder
public record OverviewStatsResponse(
        long totalMembers,
        long totalManagers,
        long presentToday,
        long lateToday,
        long absentToday,
        long onLeaveToday,
        double attendanceRateToday,
        long pendingLeaveRequests,
        long pendingTickets,
        long zonesCount,
        long routersCount
) {
}
