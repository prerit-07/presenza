package com.presenza.backend.controller;

import com.presenza.backend.dto.request.ZoneRequest;
import com.presenza.backend.dto.response.ZoneResponse;
import com.presenza.backend.service.ZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/zones")
@RequiredArgsConstructor
public class ZoneController {

    private final ZoneService zoneService;

    @GetMapping
    public List<ZoneResponse> list() {
        return zoneService.list();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public ZoneResponse create(@Valid @RequestBody ZoneRequest req) {
        return zoneService.create(req);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public ZoneResponse update(@PathVariable Long id, @RequestBody ZoneRequest req) {
        return zoneService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public void delete(@PathVariable Long id) {
        zoneService.delete(id);
    }
}
