package com.presenza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RouterRequest {
    @NotBlank
    private String zone;
    @NotBlank
    private String ssid;
    @NotBlank
    private String bssid;
    private String registeredBy;
    private String status;
}
