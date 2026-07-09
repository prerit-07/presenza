package com.presenza.backend.service;

import com.presenza.backend.dto.auth.AuthResponse;
import com.presenza.backend.dto.auth.JoinRequest;
import com.presenza.backend.dto.auth.LoginRequest;
import com.presenza.backend.dto.auth.SignupOrganizationRequest;
import com.presenza.backend.entity.*;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.ActivityLogRepository;
import com.presenza.backend.repository.JoinCodeRepository;
import com.presenza.backend.repository.OrganizationRepository;
import com.presenza.backend.repository.UserRepository;
import com.presenza.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final JoinCodeRepository joinCodeRepository;
    private final ActivityLogRepository activityLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse signupOrganization(SignupOrganizationRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw ApiException.conflict("An account already exists with this email.");
        }

        Organization org = Organization.builder()
                .name(req.getOrganizationName())
                .domain(req.getDomain())
                .email(req.getEmail())
                .build();
        org = organizationRepository.save(org);

        User admin = User.builder()
                .name(req.getAdminName())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(Role.ORGANIZATION)
                .organization(org)
                .status(MemberStatus.ACTIVE)
                .build();
        admin = userRepository.save(admin);

        // Auto-generate the two join codes every fresh organization needs.
        joinCodeRepository.save(JoinCode.builder()
                .organization(org).role(Role.MANAGER).code(generateCode("ADM")).build());
        joinCodeRepository.save(JoinCode.builder()
                .organization(org).role(Role.EMPLOYEE).code(generateCode("MEM")).build());

        activityLogRepository.save(ActivityLog.builder()
                .organization(org)
                .text(req.getOrganizationName() + " workspace created")
                .build());

        return buildAuthResponse(admin);
    }

    @Transactional
    public AuthResponse join(JoinRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw ApiException.conflict("An account already exists with this email.");
        }

        JoinCode joinCode = joinCodeRepository.findByCode(req.getJoinCode().trim().toUpperCase())
                .orElseThrow(() -> ApiException.badRequest("Invalid join code."));

        if (joinCode.getExpiry() != null && !"Never".equalsIgnoreCase(joinCode.getExpiry())) {
            try {
                if (LocalDate.now().isAfter(LocalDate.parse(joinCode.getExpiry()))) {
                    throw ApiException.badRequest("This join code has expired.");
                }
            } catch (java.time.format.DateTimeParseException ignored) {
                // Unparseable expiry values are treated as "no expiry" rather than blocking sign-ups.
            }
        }

        if (joinCode.getMaxUses() != null && !"Unlimited".equalsIgnoreCase(joinCode.getMaxUses())) {
            try {
                int max = Integer.parseInt(joinCode.getMaxUses().trim());
                if (joinCode.getUsesCount() >= max) {
                    throw ApiException.badRequest("This join code has reached its maximum number of uses.");
                }
            } catch (NumberFormatException ignored) {
                // Unparseable maxUses values are treated as "unlimited".
            }
        }

        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(joinCode.getRole())
                .organization(joinCode.getOrganization())
                .status(MemberStatus.ACTIVE)
                .joinedVia(joinCode.getCode())
                .build();
        user = userRepository.save(user);

        joinCode.setUsesCount(joinCode.getUsesCount() + 1);
        joinCodeRepository.save(joinCode);

        activityLogRepository.save(ActivityLog.builder()
                .organization(joinCode.getOrganization())
                .text(user.getName() + " joined as " + user.getRole().name().toLowerCase() + " using a join code")
                .build());

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );

        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> ApiException.notFound("No account found for this email."));

        if (user.getStatus() == MemberStatus.INACTIVE) {
            throw ApiException.forbidden("This account has been deactivated. Contact your organization admin.");
        }

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        Long orgId = user.getOrganization() != null ? user.getOrganization().getId() : null;
        String orgName = user.getOrganization() != null ? user.getOrganization().getName() : null;

        String token = jwtService.generateToken(user.getEmail(), user.getId(), user.getRole().name(), orgId);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .organizationId(orgId)
                .organizationName(orgName)
                .build();
    }

    private String generateCode(String infix) {
        StringBuilder sb = new StringBuilder("PRZ-" + infix + "-");
        for (int i = 0; i < 4; i++) {
            sb.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
