package com.presenza.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CheckInRequest {
    private String zone;
    private Boolean dualVerified;
}
