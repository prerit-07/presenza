package com.presenza.backend.dto.response;

import com.presenza.backend.entity.JoinCode;

public record JoinCodeResponse(
        Long id, String role, String code, String expiry, String maxUses, Integer usesCount
) {
    public static JoinCodeResponse from(JoinCode c) {
        return new JoinCodeResponse(c.getId(), c.getRole().name(), c.getCode(), c.getExpiry(), c.getMaxUses(), c.getUsesCount());
    }
}
