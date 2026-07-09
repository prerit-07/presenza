package com.presenza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Getter @Setter
public class ShiftRequest {
    @NotBlank
    private String name;

    @NotNull
    private LocalTime startTime;

    @NotNull
    private LocalTime endTime;

    /** Comma-separated 3-letter days, e.g. "MON,TUE,WED,THU,FRI". */
    private String days;

    private Integer graceMinutes;
}
