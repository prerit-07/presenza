package com.presenza.backend.service;

import com.presenza.backend.dto.request.AddTeamMemberRequest;
import com.presenza.backend.dto.response.MemberResponse;
import com.presenza.backend.entity.*;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.ActivityLogRepository;
import com.presenza.backend.repository.UserRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;

    // Read-only @Transactional — same lazy-loading reason as MemberService.list().
    @Transactional(readOnly = true)
    public List<MemberResponse> list() {
        Organization org = currentUser.get().getOrganization();
        return userRepository.findByOrganizationAndRole(org, Role.MANAGER).stream()
                .map(MemberResponse::from).toList();
    }

    @Transactional
    public MemberResponse add(AddTeamMemberRequest req) {
        Organization org = currentUser.get().getOrganization();
        String email = StringUtils.hasText(req.getEmail()) ? req.getEmail()
                : req.getName().toLowerCase().replaceAll("[^a-z0-9]+", ".") + "." + UUID.randomUUID().toString().substring(0, 6) + "@presenza.local";
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("An account already exists with this email.");
        }
        String password = StringUtils.hasText(req.getPassword()) ? req.getPassword() : UUID.randomUUID().toString();
        User manager = User.builder()
                .name(req.getName()).email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(Role.MANAGER).organization(org).status(MemberStatus.ACTIVE)
                .title(req.getTitle() != null ? req.getTitle() : "Manager").build();
        manager = userRepository.save(manager);
        activityLogRepository.save(ActivityLog.builder().organization(org)
                .text(manager.getName() + " added as a manager").build());
        return MemberResponse.from(manager);
    }

    @Transactional
    public void remove(Long id) {
        User manager = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Team member not found."));
        Organization org = currentUser.get().getOrganization();
        if (!manager.getOrganization().getId().equals(org.getId()) || manager.getRole() != Role.MANAGER) {
            throw ApiException.forbidden("Not your organization's manager.");
        }
        userRepository.delete(manager);
    }
}
