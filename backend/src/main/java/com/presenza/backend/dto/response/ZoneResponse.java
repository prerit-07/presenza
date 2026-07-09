package com.presenza.backend.dto.response;

import com.presenza.backend.entity.Zone;

public record ZoneResponse(
        Long id,
        String name,
        Double latitude,
        Double longitude,
        String coords,
        String radius,
        String floor,
        String verification
) {
    public static ZoneResponse from(Zone z) {
        String coords = (z.getLatitude() != null && z.getLongitude() != null)
                ? String.format("%.4f°N, %.4f°E", z.getLatitude(), z.getLongitude())
                : "0.0000°N, 0.0000°E";
        return new ZoneResponse(z.getId(), z.getName(), z.getLatitude(), z.getLongitude(),
                coords, z.getRadius(), z.getFloor(), z.getVerification());
    }
}
