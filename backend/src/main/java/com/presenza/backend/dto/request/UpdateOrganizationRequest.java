package com.presenza.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateOrganizationRequest {
    private String name;
    private String domain;
    private String timezone;
    private String plan;
}
