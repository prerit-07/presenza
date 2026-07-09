package com.presenza.backend.dto.response;

import com.presenza.backend.entity.Organization;

public record OrganizationResponse(
        Long id, String name, String domain, String email, String timezone, String plan
) {
    public static OrganizationResponse from(Organization o) {
        return new OrganizationResponse(o.getId(), o.getName(), o.getDomain(), o.getEmail(), o.getTimezone(), o.getPlan());
    }
}
