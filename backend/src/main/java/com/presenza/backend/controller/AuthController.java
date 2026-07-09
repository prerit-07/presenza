package com.presenza.backend.controller;

import com.presenza.backend.dto.auth.AuthResponse;
import com.presenza.backend.dto.auth.JoinRequest;
import com.presenza.backend.dto.auth.LoginRequest;
import com.presenza.backend.dto.auth.SignupOrganizationRequest;
import com.presenza.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup/organization")
    public ResponseEntity<AuthResponse> signupOrganization(@Valid @RequestBody SignupOrganizationRequest req) {
        return ResponseEntity.ok(authService.signupOrganization(req));
    }

    @PostMapping("/join")
    public ResponseEntity<AuthResponse> join(@Valid @RequestBody JoinRequest req) {
        return ResponseEntity.ok(authService.join(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }
}
