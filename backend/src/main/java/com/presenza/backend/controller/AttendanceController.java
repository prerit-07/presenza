package com.presenza.backend.controller;

import com.presenza.backend.dto.request.CheckInRequest;
import com.presenza.backend.dto.response.AttendanceReportEntry;
import com.presenza.backend.dto.response.AttendanceResponse;
import com.presenza.backend.dto.response.MyDashboardResponse;
import com.presenza.backend.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public List<AttendanceResponse> list(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return attendanceService.listForOrganization(date);
    }

    @GetMapping("/me")
    public List<AttendanceResponse> myAttendance() {
        return attendanceService.listForCurrentUser();
    }

    @GetMapping("/me/dashboard")
    public MyDashboardResponse myDashboard() {
        return attendanceService.myDashboard();
    }

    @PostMapping("/check-in")
    public AttendanceResponse checkIn(@RequestBody CheckInRequest req) {
        return attendanceService.checkIn(req);
    }

    @PostMapping("/check-out")
    public AttendanceResponse checkOut() {
        return attendanceService.checkOut();
    }

    @GetMapping("/report")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public List<AttendanceReportEntry> report(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return attendanceService.report(from, to);
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public ResponseEntity<byte[]> export(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        byte[] csv = attendanceService.reportCsv(from, to).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"attendance_" + from + "_to_" + to + ".csv\"")
                .body(csv);
    }
}
