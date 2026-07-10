package com.presenza.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "zones")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Zone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(nullable = false)
    private String name;

    private Double latitude;
    private Double longitude;

    /** e.g. "25m" — kept as the display string, matching the frontend. */
    @Builder.Default
    private String radius = "25m";

    private String floor;

    @Builder.Default
    private String verification = "WiFi BSSID + GPS";
}
