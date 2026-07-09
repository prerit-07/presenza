package com.presenza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class TicketCreateRequest {
    private String section;
    @NotBlank
    private String oldDevice;
    @NotBlank
    private String newDevice;
    private String reason;
}
