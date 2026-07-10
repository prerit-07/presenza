package com.presenza.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "wifi_routers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WifiRouter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    /** Zone name label, matching the frontend's simple string zone field. */
    @Column(nullable = false)
    private String zone;

    @Column(nullable = false)
    private String ssid;

    @Column(nullable = false)
    private String bssid;

    private String registeredBy;

    @Builder.Default
    private String status = "Active";
}
