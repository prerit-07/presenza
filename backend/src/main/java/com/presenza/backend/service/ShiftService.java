package com.presenza.backend.service;

import com.presenza.backend.dto.request.AssignShiftRequest;
import com.presenza.backend.dto.request.ShiftRequest;
import com.presenza.backend.dto.response.ShiftResponse;
import com.presenza.backend.dto.response.TimetableEntryResponse;
import com.presenza.backend.entity.ActivityLog;
import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.Shift;
import com.presenza.backend.entity.User;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.ActivityLogRepository;
import com.presenza.backend.repository.ShiftRepository;
import com.presenza.backend.repository.UserRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final CurrentUser currentUser;

    public List<ShiftResponse> list() {
        Organization org = currentUser.get().getOrganization();
        return shiftRepository.findByOrganization(org).stream()
                .map(s -> ShiftResponse.from(s, (int) userRepository.countByShift(s)))
                .toList();
    }

    @Transactional
    public ShiftResponse create(ShiftRequest req) {
        Organization org = currentUser.get().getOrganization();
        Shift.ShiftBuilder builder = Shift.builder()
                .organization(org).name(req.getName())
                .startTime(req.getStartTime()).endTime(req.getEndTime());
        if (StringUtils.hasText(req.getDays())) builder.days(req.getDays());
        if (req.getGraceMinutes() != null) builder.graceMinutes(req.getGraceMinutes());
        Shift saved = shiftRepository.save(builder.build());
        activityLogRepository.save(ActivityLog.builder().organization(org)
                .text("Shift \"" + saved.getName() + "\" created").build());
        return ShiftResponse.from(saved, 0);
    }

    @Transactional
    public ShiftResponse update(Long id, ShiftRequest req) {
        Shift shift = owned(id);
        if (StringUtils.hasText(req.getName())) shift.setName(req.getName());
        if (req.getStartTime() != null) shift.setStartTime(req.getStartTime());
        if (req.getEndTime() != null) shift.setEndTime(req.getEndTime());
        if (StringUtils.hasText(req.getDays())) shift.setDays(req.getDays());
        if (req.getGraceMinutes() != null) shift.setGraceMinutes(req.getGraceMinutes());
        Shift saved = shiftRepository.save(shift);
        return ShiftResponse.from(saved, (int) userRepository.countByShift(saved));
    }

    @Transactional
    public void delete(Long id) {
        Shift shift = owned(id);
        // Unassign anyone currently on this shift rather than blocking/cascading the delete.
        userRepository.findByOrganizationAndShift(shift.getOrganization(), shift).forEach(u -> {
            u.setShift(null);
            userRepository.save(u);
        });
        shiftRepository.delete(shift);
    }

    // Read-only @Transactional on purpose: TimetableEntryResponse.from() reads
    // user.getShift().getName()/getStartTime()/etc., and Shift is a lazy @ManyToOne on User.
    // Outside an open transaction (open-in-view=false) that throws LazyInitializationException.
    @Transactional(readOnly = true)
    public List<TimetableEntryResponse> timetable() {
        Organization org = currentUser.get().getOrganization();
        return userRepository.findByOrganization(org).stream()
                .map(TimetableEntryResponse::from)
                .toList();
    }

    @Transactional
    public TimetableEntryResponse assign(Long userId, AssignShiftRequest req) {
        Organization org = currentUser.get().getOrganization();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Member not found."));
        if (user.getOrganization() == null || !user.getOrganization().getId().equals(org.getId())) {
            throw ApiException.forbidden("Not your organization's member.");
        }
        if (req.getShiftId() == null) {
            user.setShift(null);
        } else {
            Shift shift = shiftRepository.findById(req.getShiftId())
                    .orElseThrow(() -> ApiException.notFound("Shift not found."));
            if (!shift.getOrganization().getId().equals(org.getId())) {
                throw ApiException.forbidden("Not your organization's shift.");
            }
            user.setShift(shift);
        }
        User saved = userRepository.save(user);
        activityLogRepository.save(ActivityLog.builder().organization(org)
                .text(saved.getName() + " assigned to " + (saved.getShift() != null ? saved.getShift().getName() : "no shift"))
                .build());
        return TimetableEntryResponse.from(saved);
    }

    private Shift owned(Long id) {
        Shift shift = shiftRepository.findById(id).orElseThrow(() -> ApiException.notFound("Shift not found."));
        if (!shift.getOrganization().getId().equals(currentUser.get().getOrganization().getId())) {
            throw ApiException.forbidden("Not your organization's shift.");
        }
        return shift;
    }
}
