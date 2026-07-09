package com.presenza.backend.controller;

import com.presenza.backend.dto.response.JoinCodeResponse;
import com.presenza.backend.service.JoinCodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/join-codes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
public class JoinCodeController {

    private final JoinCodeService joinCodeService;

    @GetMapping
    public List<JoinCodeResponse> list() {
        return joinCodeService.list();
    }

    @PostMapping("/{id}/regenerate")
    public JoinCodeResponse regenerate(@PathVariable Long id) {
        return joinCodeService.regenerate(id);
    }

    @PatchMapping("/{id}")
    public JoinCodeResponse updateSettings(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        return joinCodeService.updateSettings(id, body.get("expiry"), body.get("maxUses"));
    }
}
