package com.presenza.backend.dto.response;

import com.presenza.backend.entity.WifiRouter;

public record RouterResponse(
        Long id,
        String zone,
        String ssid,
        String bssid,
        String registeredBy,
        String status
) {
    public static RouterResponse from(WifiRouter r) {
        return new RouterResponse(r.getId(), r.getZone(), r.getSsid(), r.getBssid(), r.getRegisteredBy(), r.getStatus());
    }
}
