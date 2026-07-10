package com.presenza.backend.service;

import com.presenza.backend.dto.request.AddMemberRequest;
import com.presenza.backend.dto.request.UpdateMemberRequest;
import com.presenza.backend.dto.response.BulkImportResult;
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

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;

    // Read-only @Transactional: MemberResponse.from() reads user.getShift().getName() for
    // members who have one assigned, and Shift is a lazy @ManyToOne — see AttendanceService
    // for the full explanation of why this needs an open transaction.
    @Transactional(readOnly = true)
    public List<MemberResponse> list() {
        Organization org = currentUser.get().getOrganization();
        return userRepository.findByOrganizationAndRole(org, Role.EMPLOYEE).stream()
                .map(MemberResponse::from).toList();
    }

    @Transactional
    public MemberResponse add(AddMemberRequest req) {
        Organization org = currentUser.get().getOrganization();
        String email = StringUtils.hasText(req.getEmail()) ? req.getEmail()
                : req.getName().toLowerCase().replaceAll("[^a-z0-9]+", ".") + "." + UUID.randomUUID().toString().substring(0, 6) + "@presenza.local";
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("An account already exists with this email.");
        }
        User member = User.builder()
                .name(req.getName()).email(email)
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.EMPLOYEE).organization(org).status(MemberStatus.ACTIVE)
                .title(req.getTitle()).build();
        member = userRepository.save(member);
        activityLogRepository.save(ActivityLog.builder().organization(org)
                .text(member.getName() + " added as a member").build());
        return MemberResponse.from(member);
    }

    @Transactional
    public MemberResponse update(Long id, UpdateMemberRequest req) {
        User member = owned(id);
        if (StringUtils.hasText(req.getName())) member.setName(req.getName());
        if (StringUtils.hasText(req.getTitle())) member.setTitle(req.getTitle());
        if (StringUtils.hasText(req.getStatus())) {
            member.setStatus("Inactive".equalsIgnoreCase(req.getStatus()) ? MemberStatus.INACTIVE : MemberStatus.ACTIVE);
        }
        return MemberResponse.from(userRepository.save(member));
    }

    @Transactional
    public void delete(Long id) {
        userRepository.delete(owned(id));
    }

    /** Bulk-creates members from CSV text: one per line as "name,email,title" (email/title optional).
     *  Skips blank lines, a possible header row, and rows with an email that already exists. */
    @Transactional
    public BulkImportResult bulkImport(String csv) {
        Organization org = currentUser.get().getOrganization();
        int created = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        if (!StringUtils.hasText(csv)) {
            return new BulkImportResult(0, 0, List.of("No CSV content provided."));
        }

        String[] lines = csv.split("\\r?\\n");
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            if (i == 0 && line.toLowerCase().startsWith("name,")) continue; // skip header row

            String[] cols = line.split(",", -1);
            String name = cols.length > 0 ? cols[0].trim() : "";
            String email = cols.length > 1 ? cols[1].trim() : "";
            String title = cols.length > 2 ? cols[2].trim() : null;

            if (name.isEmpty()) {
                errors.add("Line " + (i + 1) + ": missing name, skipped.");
                skipped++;
                continue;
            }
            String resolvedEmail = StringUtils.hasText(email) ? email
                    : name.toLowerCase().replaceAll("[^a-z0-9]+", ".") + "." + UUID.randomUUID().toString().substring(0, 6) + "@presenza.local";

            if (userRepository.existsByEmail(resolvedEmail)) {
                errors.add("Line " + (i + 1) + ": \"" + resolvedEmail + "\" already exists, skipped.");
                skipped++;
                continue;
            }

            User member = User.builder()
                    .name(name).email(resolvedEmail)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(Role.EMPLOYEE).organization(org).status(MemberStatus.ACTIVE)
                    .title(StringUtils.hasText(title) ? title : null)
                    .build();
            userRepository.save(member);
            created++;
        }

        if (created > 0) {
            activityLogRepository.save(ActivityLog.builder().organization(org)
                    .text(created + " member(s) bulk-imported").build());
        }
        return new BulkImportResult(created, skipped, errors);
    }

    private User owned(Long id) {
        User member = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Member not found."));
        Organization org = currentUser.get().getOrganization();
        if (member.getOrganization() == null || !member.getOrganization().getId().equals(org.getId())) {
            throw ApiException.forbidden("Not your organization's member.");
        }
        return member;
    }
}
