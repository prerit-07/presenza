package com.presenza.backend.service;

import com.presenza.backend.dto.response.JoinCodeResponse;
import com.presenza.backend.entity.JoinCode;
import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.Role;
import com.presenza.backend.entity.User;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.JoinCodeRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JoinCodeService {

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    private final JoinCodeRepository joinCodeRepository;
    private final CurrentUser currentUser;

    public List<JoinCodeResponse> list() {
        Organization org = currentUser.get().getOrganization();
        return joinCodeRepository.findByOrganization(org).stream().map(JoinCodeResponse::from).toList();
    }

    @Transactional
    public JoinCodeResponse regenerate(Long id) {
        User user = currentUser.get();
        JoinCode code = joinCodeRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Join code not found."));
        if (!code.getOrganization().getId().equals(user.getOrganization().getId())) {
            throw ApiException.forbidden("Not your organization's join code.");
        }
        code.setCode(generateCode(code.getRole() == Role.MANAGER ? "ADM" : "MEM"));
        code.setUsesCount(0);
        return JoinCodeResponse.from(joinCodeRepository.save(code));
    }

    @Transactional
    public JoinCodeResponse updateSettings(Long id, String expiry, String maxUses) {
        User user = currentUser.get();
        JoinCode code = joinCodeRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Join code not found."));
        if (!code.getOrganization().getId().equals(user.getOrganization().getId())) {
            throw ApiException.forbidden("Not your organization's join code.");
        }
        if (expiry != null) code.setExpiry(expiry);
        if (maxUses != null) code.setMaxUses(maxUses);
        return JoinCodeResponse.from(joinCodeRepository.save(code));
    }

    private String generateCode(String infix) {
        StringBuilder sb = new StringBuilder("PRZ-" + infix + "-");
        for (int i = 0; i < 4; i++) sb.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
        return sb.toString();
    }
}
