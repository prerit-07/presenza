package com.presenza.backend.controller;

import com.presenza.backend.dto.request.AssignShiftRequest;
import com.presenza.backend.dto.request.ShiftRequest;
import com.presenza.backend.dto.response.ShiftResponse;
import com.presenza.backend.dto.response.TimetableEntryResponse;
import com.presenza.backend.service.ShiftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
public class ShiftController {

    private final ShiftService shiftService;

    @GetMapping("/api/shifts")
    public List<ShiftResponse> list() {
        return shiftService.list();
    }

    @PostMapping("/api/shifts")
    public ShiftResponse create(@Valid @RequestBody ShiftRequest req) {
        return shiftService.create(req);
    }

    @PatchMapping("/api/shifts/{id}")
    public ShiftResponse update(@PathVariable Long id, @RequestBody ShiftRequest req) {
        return shiftService.update(id, req);
    }

    @DeleteMapping("/api/shifts/{id}")
    public void delete(@PathVariable Long id) {
        shiftService.delete(id);
    }

    @GetMapping("/api/shifts/timetable")
    public List<TimetableEntryResponse> timetable() {
        return shiftService.timetable();
    }

    @PostMapping("/api/members/{userId}/shift")
    public TimetableEntryResponse assign(@PathVariable Long userId, @RequestBody AssignShiftRequest req) {
        return shiftService.assign(userId, req);
    }
}
