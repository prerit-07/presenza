package com.presenza.backend.service;

import com.presenza.backend.dto.request.CheckInRequest;
import com.presenza.backend.dto.response.AttendanceReportEntry;
import com.presenza.backend.dto.response.AttendanceResponse;
import com.presenza.backend.dto.response.MyDashboardResponse;
import com.presenza.backend.entity.*;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.AttendanceRecordRepository;
import com.presenza.backend.repository.LeaveRequestRepository;
import com.presenza.backend.repository.UserRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private static final int ANNUAL_LEAVE_ENTITLEMENT = 12;

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final UserRepository userRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final CurrentUser currentUser;

    // Both list methods below are read-only @Transactional on purpose: AttendanceResponse.from()
    // reads record.getUser().getName(), and User is a lazy @ManyToOne. With
    // spring.jpa.open-in-view=false, touching a lazy field outside an open transaction throws
    // LazyInitializationException — which the frontend's error handling was silently swallowing
    // into an empty list, making it look like "no records" when the record actually existed.

    @Transactional(readOnly = true)
    public List<AttendanceResponse> listForOrganization(LocalDate date) {
        Organization org = currentUser.get().getOrganization();
        LocalDate target = date != null ? date : LocalDate.now();
        return attendanceRecordRepository.findByOrganizationAndDate(org, target).stream()
                .map(AttendanceResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> listForCurrentUser() {
        User user = currentUser.get();
        return attendanceRecordRepository.findByUser(user).stream().map(AttendanceResponse::from).toList();
    }

    @Transactional
    public AttendanceResponse checkIn(CheckInRequest req) {
        User user = currentUser.get();
        LocalDate today = LocalDate.now();
        AttendanceRecord record = attendanceRecordRepository.findByUserAndDate(user, today)
                .orElseGet(() -> AttendanceRecord.builder().user(user).organization(user.getOrganization()).date(today).build());
        record.setCheckIn(LocalTime.now());
        record.setCheckOut(null); // re-checking in after an earlier checkout today starts a fresh session
        record.setZone(req.getZone());
        record.setDualVerified(Boolean.TRUE.equals(req.getDualVerified()));
        LocalTime cutoff = lateCutoffFor(user);
        record.setStatus(record.getCheckIn().isAfter(cutoff) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT);
        AttendanceRecord saved = attendanceRecordRepository.save(record);
        recalculateAttendancePercent(user);
        return AttendanceResponse.from(saved);
    }

    /** If the user has an assigned Shift, LATE is judged against that shift's start time + its
     *  grace period. Otherwise falls back to a flat 9:30 AM default so unscheduled orgs keep working. */
    private LocalTime lateCutoffFor(User user) {
        if (user.getShift() != null) {
            int grace = user.getShift().getGraceMinutes() != null ? user.getShift().getGraceMinutes() : 0;
            return user.getShift().getStartTime().plusMinutes(grace);
        }
        return LocalTime.of(9, 30);
    }

    /** Recomputes the user's denormalized attendance percentage: days present/late out of
     *  the days elapsed since they joined (used to render the % shown on member lists). */
    private void recalculateAttendancePercent(User user) {
        long daysSinceJoin = Math.max(1, ChronoUnit.DAYS.between(
                user.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate(),
                LocalDate.now()) + 1);
        long presentDays = attendanceRecordRepository.countByUserAndStatusIn(
                user, List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE));
        int percent = (int) Math.min(100, Math.round((presentDays * 100.0) / daysSinceJoin));
        user.setAttendancePercent(percent);
        userRepository.save(user);
    }

    /** Per-member attendance summary for a date range (used by the admin's attendance report screen). */
    public List<AttendanceReportEntry> report(LocalDate from, LocalDate to) {
        Organization org = currentUser.get().getOrganization();
        List<AttendanceRecord> records = attendanceRecordRepository
                .findByOrganizationAndDateBetweenOrderByDateAsc(org, from, to);
        Map<Long, List<AttendanceRecord>> byUser = records.stream()
                .collect(Collectors.groupingBy(r -> r.getUser().getId()));

        long workingDays = countWorkingDays(from, to);
        List<User> members = userRepository.findByOrganization(org).stream()
                .filter(u -> u.getRole() != Role.ORGANIZATION)
                .toList();

        List<AttendanceReportEntry> report = new ArrayList<>();
        for (User u : members) {
            List<AttendanceRecord> mine = byUser.getOrDefault(u.getId(), List.of());
            long present = mine.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
            long late = mine.stream().filter(r -> r.getStatus() == AttendanceStatus.LATE).count();
            long onLeave = mine.stream().filter(r -> r.getStatus() == AttendanceStatus.ON_LEAVE).count();
            long absent = Math.max(0, workingDays - present - late - onLeave);
            double rate = workingDays == 0 ? 0.0
                    : Math.round(((present + late) * 1000.0) / workingDays) / 10.0;
            report.add(new AttendanceReportEntry(
                    u.getId(), u.getName(), u.getTitle() != null ? u.getTitle() : u.getRole().name(),
                    present, late, onLeave, absent, workingDays, rate));
        }
        return report;
    }

    /** Same data as {@link #report}, rendered as CSV text for the admin to download. */
    public String reportCsv(LocalDate from, LocalDate to) {
        StringBuilder sb = new StringBuilder("Name,Title,Present,Late,On Leave,Absent,Working Days,Attendance Rate (%)\n");
        for (AttendanceReportEntry e : report(from, to)) {
            sb.append(csvField(e.name())).append(',')
                    .append(csvField(e.title())).append(',')
                    .append(e.presentDays()).append(',')
                    .append(e.lateDays()).append(',')
                    .append(e.onLeaveDays()).append(',')
                    .append(e.absentDays()).append(',')
                    .append(e.workingDays()).append(',')
                    .append(e.attendanceRate()).append('\n');
        }
        return sb.toString();
    }

    private String csvField(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        return escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")
                ? "\"" + escaped + "\"" : escaped;
    }

    private long countWorkingDays(LocalDate from, LocalDate to) {
        long count = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            if (d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY) count++;
        }
        return count;
    }

    /** Real numbers for the employee's own dashboard cards (attendance %, streak, leave
     *  balance, verification mode, assigned shift) — replaces what used to be hardcoded HTML.
     *  Read-only @Transactional: once a shift is assigned, user.getShift() is a lazy proxy —
     *  reading shift.getName()/getStartTime()/etc. outside a transaction throws
     *  LazyInitializationException, which the frontend silently turns into a zeroed dashboard. */
    @Transactional(readOnly = true)
    public MyDashboardResponse myDashboard() {
        User user = currentUser.get();

        int attendancePercent = user.getAttendancePercent() != null ? user.getAttendancePercent() : 0;
        int dayStreak = computeDayStreak(user);

        int leavesUsed = leaveRequestRepository.findByUserOrderByAppliedOnDesc(user).stream()
                .filter(l -> l.getStatus() == RequestStatus.APPROVED)
                .filter(l -> l.getFromDate() != null && l.getFromDate().getYear() == LocalDate.now().getYear())
                .mapToInt(l -> (int) (ChronoUnit.DAYS.between(l.getFromDate(), l.getToDate()) + 1))
                .sum();
        int leavesRemaining = Math.max(0, ANNUAL_LEAVE_ENTITLEMENT - leavesUsed);

        String verificationMode = attendanceRecordRepository.findByUser(user).stream()
                .max(Comparator.comparing(AttendanceRecord::getDate))
                .map(r -> Boolean.TRUE.equals(r.getDualVerified()) ? "GPS + WiFi" : "GPS only")
                .orElse("GPS + WiFi");

        Shift shift = user.getShift();
        return new MyDashboardResponse(
                attendancePercent, dayStreak, leavesRemaining, ANNUAL_LEAVE_ENTITLEMENT, verificationMode,
                shift != null ? shift.getName() : "No shift assigned",
                shift != null ? shift.getStartTime().toString() : null,
                shift != null ? shift.getEndTime().toString() : null,
                shift != null ? shift.getDays() : null
        );
    }

    /** Consecutive working days (walking backward from today, skipping weekends) the user
     *  was PRESENT or LATE, stopping at the first working day with no record or an absence. */
    private int computeDayStreak(User user) {
        Map<LocalDate, AttendanceRecord> byDate = attendanceRecordRepository.findByUser(user).stream()
                .collect(Collectors.toMap(AttendanceRecord::getDate, r -> r, (a, b) -> a));

        int streak = 0;
        LocalDate d = LocalDate.now();
        while (true) {
            if (d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY) {
                d = d.minusDays(1);
                continue;
            }
            AttendanceRecord record = byDate.get(d);
            boolean present = record != null &&
                    (record.getStatus() == AttendanceStatus.PRESENT || record.getStatus() == AttendanceStatus.LATE);
            if (!present) {
                // Today not checked in yet shouldn't break an existing streak from prior days.
                if (d.equals(LocalDate.now())) {
                    d = d.minusDays(1);
                    continue;
                }
                break;
            }
            streak++;
            d = d.minusDays(1);
        }
        return streak;
    }

    @Transactional
    public AttendanceResponse checkOut() {
        User user = currentUser.get();
        LocalDate today = LocalDate.now();
        AttendanceRecord record = attendanceRecordRepository.findByUserAndDate(user, today)
                .orElseThrow(() -> ApiException.badRequest("No check-in found for today."));
        record.setCheckOut(LocalTime.now());
        return AttendanceResponse.from(attendanceRecordRepository.save(record));
    }
}
