package com.presenza.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter @Setter
public class LeaveRequestCreateRequest {
    @NotNull
    private LocalDate fromDate;
    @NotNull
    private LocalDate toDate;
    private String reason;
}
