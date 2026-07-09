package com.presenza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ZoneRequest {
    @NotBlank
    private String name;
    private Double latitude;
    private Double longitude;
    private String radius;
    private String floor;
    private String verification;
}
