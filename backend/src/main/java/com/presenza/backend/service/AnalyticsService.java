package com.presenza.backend.service;

import com.presenza.backend.dto.response.AttendanceAlert;
import com.presenza.backend.dto.response.OverviewStatsResponse;
import com.presenza.backend.entity.*;
import com.presenza.backend.repository.*;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final UserRepository userRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final TicketRepository ticketRepository;
    private final ZoneRepository zoneRepository;
    private final WifiRouterRepository wifiRouterRepository;
    private final CurrentUser currentUser;

    public OverviewStatsResponse overview() {
        Organization org = currentUser.get().getOrganization();

        long totalMembers = userRepository.findByOrganizationAndRole(org, Role.EMPLOYEE).size();
        long totalManagers = userRepository.findByOrganizationAndRole(org, Role.MANAGER).size();

        List<AttendanceRecord> today = attendanceRecordRepository.findByOrganizationAndDate(org, LocalDate.now());
        long present = today.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
        long late = today.stream().filter(r -> r.getStatus() == AttendanceStatus.LATE).count();
        long onLeave = today.stream().filter(r -> r.getStatus() == AttendanceStatus.ON_LEAVE).count();
        long absent = Math.max(0, totalMembers - present - late - onLeave);
        double rate = totalMembers == 0 ? 0.0 : Math.round(((present + late) * 1000.0) / totalMembers) / 10.0;

        long pendingLeave = leaveRequestRepository.findByOrganizationOrderByAppliedOnDesc(org).stream()
                .filter(l -> l.getStatus() == RequestStatus.PENDING).count();
        long pendingTickets = ticketRepository.findByOrganizationOrderByCreatedAtDesc(org).stream()
                .filter(t -> t.getStatus() == TicketStatus.PENDING).count();

        long zones = zoneRepository.findByOrganization(org).size();
        long routers = wifiRouterRepository.findByOrganization(org).size();

        return OverviewStatsResponse.builder()
                .totalMembers(totalMembers).totalManagers(totalManagers)
                .presentToday(present).lateToday(late).absentToday(absent).onLeaveToday(onLeave)
                .attendanceRateToday(rate)
                .pendingLeaveRequests(pendingLeave).pendingTickets(pendingTickets)
                .zonesCount(zones).routersCount(routers)
                .build();
    }

    /** Surfaces members a manager should look at without manually scanning every record:
     *  frequent lateness in the trailing week, or no check-in for several working days. */
    public List<AttendanceAlert> alerts() {
        Organization org = currentUser.get().getOrganization();
        LocalDate today = LocalDate.now();
        LocalDate weekAgo = today.minusDays(6);

        List<AttendanceRecord> window = attendanceRecordRepository
                .findByOrganizationAndDateBetweenOrderByDateAsc(org, weekAgo, today);

        Map<Long, List<AttendanceRecord>> byUser = window.stream()
                .collect(Collectors.groupingBy(r -> r.getUser().getId()));

        List<User> members = userRepository.findByOrganization(org).stream()
                .filter(u -> u.getRole() != Role.ORGANIZATION && u.getStatus() == MemberStatus.ACTIVE)
                .toList();

        List<AttendanceAlert> alerts = new ArrayList<>();
        for (User u : members) {
            List<AttendanceRecord> mine = byUser.getOrDefault(u.getId(), List.of());

            long lateCount = mine.stream().filter(r -> r.getStatus() == AttendanceStatus.LATE).count();
            if (lateCount >= 3) {
                alerts.add(new AttendanceAlert(u.getId(), u.getName(),
                        u.getTitle() != null ? u.getTitle() : u.getRole().name(),
                        "FREQUENT_LATE", "Late " + lateCount + " times in the last 7 days"));
            }

            LocalDate lastCheckIn = mine.stream()
                    .filter(r -> r.getStatus() == AttendanceStatus.PRESENT || r.getStatus() == AttendanceStatus.LATE)
                    .map(AttendanceRecord::getDate)
                    .max(Comparator.naturalOrder())
                    .orElse(null);

            long missedWorkingDays = countWorkingDaysSince(lastCheckIn, today);
            if (missedWorkingDays >= 3) {
                String detail = lastCheckIn == null
                        ? "No check-in recorded yet"
                        : "No check-in since " + lastCheckIn + " (" + missedWorkingDays + " working days)";
                alerts.add(new AttendanceAlert(u.getId(), u.getName(),
                        u.getTitle() != null ? u.getTitle() : u.getRole().name(),
                        "ABSENCE_STREAK", detail));
            }
        }
        return alerts;
    }

    /** Working days (Mon-Fri) strictly after {@code lastDate} up to and including {@code today}.
     *  If lastDate is null, counts back to the earliest working day in the trailing 2 weeks as a cap. */
    private long countWorkingDaysSince(LocalDate lastDate, LocalDate today) {
        LocalDate start = lastDate != null ? lastDate.plusDays(1) : today.minusDays(13);
        long count = 0;
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) {
            if (d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY) count++;
        }
        return count;
    }
}
