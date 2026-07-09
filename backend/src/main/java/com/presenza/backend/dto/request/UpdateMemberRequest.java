package com.presenza.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateMemberRequest {
    private String name;
    private String title;
    /** "Active" or "Inactive" */
    private String status;
}
