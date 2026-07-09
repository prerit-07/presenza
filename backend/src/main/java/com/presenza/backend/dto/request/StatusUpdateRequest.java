package com.presenza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** Generic { "status": "..." } body, reused for leave-request and ticket status updates. */
@Getter @Setter
public class StatusUpdateRequest {
    @NotBlank
    private String status;
}
