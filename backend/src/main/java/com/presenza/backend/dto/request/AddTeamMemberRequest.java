package com.presenza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** Adds a MANAGER-role user to the organization's team. Email/password are optional —
 *  if omitted, the backend auto-generates a placeholder account (matching the frontend's
 *  "just add a name + role" flow). */
@Getter @Setter
public class AddTeamMemberRequest {
    @NotBlank
    private String name;
    private String email;
    private String password;
    private String title;
}
