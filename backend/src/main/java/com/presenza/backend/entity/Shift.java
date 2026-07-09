package com.presenza.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Entity
@Table(name = "shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    /** e.g. "Morning Shift", "Night Shift" */
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    /** Comma-separated 3-letter days, e.g. "MON,TUE,WED,THU,FRI". */
    @Builder.Default
    private String days = "MON,TUE,WED,THU,FRI";

    /** Minutes of grace before a check-in after startTime counts as LATE. */
    @Builder.Default
    private Integer graceMinutes = 15;
}
