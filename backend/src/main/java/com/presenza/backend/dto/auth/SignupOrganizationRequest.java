package com.presenza.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SignupOrganizationRequest {

    @NotBlank
    private String organizationName;

    private String domain;

    @NotBlank
    private String adminName;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 4, message = "Password must be at least 4 characters")
    private String password;
}
