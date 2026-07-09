package com.presenza.backend.controller;

import com.presenza.backend.dto.request.AddTeamMemberRequest;
import com.presenza.backend.dto.response.MemberResponse;
import com.presenza.backend.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/team")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public List<MemberResponse> list() {
        return teamService.list();
    }

    @PostMapping
    @PreAuthorize("hasRole('ORGANIZATION')")
    public MemberResponse add(@Valid @RequestBody AddTeamMemberRequest req) {
        return teamService.add(req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public void remove(@PathVariable Long id) {
        teamService.remove(id);
    }
}
