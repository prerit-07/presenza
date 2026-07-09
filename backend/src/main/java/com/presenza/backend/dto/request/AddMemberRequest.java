package com.presenza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AddMemberRequest {
    @NotBlank
    private String name;
    private String email;
    /** Free-text label e.g. "Student" / "Professor" / "Manager" */
    private String title;
}
