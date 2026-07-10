package com.presenza.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "app_users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MemberStatus status = MemberStatus.ACTIVE;

    /** e.g. "PRZ-MEM-4T2W" — which join code this user signed up with. */
    private String joinedVia;

    /** Free-text label shown in the UI (e.g. "Student", "Professor", "Manager") — separate
     *  from the auth {@link Role}, which only governs permissions. */
    private String title;

    /** Denormalized attendance percentage shown across the dashboards. */
    @Builder.Default
    private Integer attendancePercent = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
