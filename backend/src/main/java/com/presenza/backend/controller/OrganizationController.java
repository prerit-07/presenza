package com.presenza.backend.controller;

import com.presenza.backend.dto.request.UpdateOrganizationRequest;
import com.presenza.backend.dto.response.OrganizationResponse;
import com.presenza.backend.service.OrganizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organization")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    public OrganizationResponse getProfile() {
        return organizationService.getProfile();
    }

    @PatchMapping
    @PreAuthorize("hasRole('ORGANIZATION')")
    public OrganizationResponse updateProfile(@RequestBody UpdateOrganizationRequest req) {
        return organizationService.updateProfile(req);
    }
}
