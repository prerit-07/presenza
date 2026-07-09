package com.presenza.backend.controller;

import com.presenza.backend.dto.response.AttendanceAlert;
import com.presenza.backend.dto.response.OverviewStatsResponse;
import com.presenza.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    public OverviewStatsResponse overview() {
        return analyticsService.overview();
    }

    @GetMapping("/alerts")
    public List<AttendanceAlert> alerts() {
        return analyticsService.alerts();
    }
}
