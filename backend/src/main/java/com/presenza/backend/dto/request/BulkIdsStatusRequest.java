package com.presenza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter
public class BulkIdsStatusRequest {
    @NotEmpty
    private List<Long> ids;

    @NotBlank
    private String status;
}
