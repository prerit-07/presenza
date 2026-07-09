package com.presenza.backend.dto.response;

import com.presenza.backend.entity.ActivityLog;

public record ActivityResponse(Long id, String text, String time) {
    public static ActivityResponse from(ActivityLog log) {
        return new ActivityResponse(log.getId(), log.getText(), log.getCreatedAt().toString());
    }
}
