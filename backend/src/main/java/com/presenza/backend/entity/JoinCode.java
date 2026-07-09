package com.presenza.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "join_codes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JoinCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role; // MANAGER or EMPLOYEE

    @Column(nullable = false, unique = true)
    private String code;

    /** "Never" or an ISO date string — kept simple to match the frontend. */
    @Builder.Default
    private String expiry = "Never";

    /** "Unlimited" or a number as a string. */
    @Builder.Default
    private String maxUses = "Unlimited";

    @Builder.Default
    private Integer usesCount = 0;
}
