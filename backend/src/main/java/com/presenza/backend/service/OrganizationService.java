package com.presenza.backend.service;

import com.presenza.backend.dto.request.UpdateOrganizationRequest;
import com.presenza.backend.dto.response.OrganizationResponse;
import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.User;
import com.presenza.backend.repository.OrganizationRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final CurrentUser currentUser;

    public OrganizationResponse getProfile() {
        return OrganizationResponse.from(organization());
    }

    @Transactional
    public OrganizationResponse updateProfile(UpdateOrganizationRequest req) {
        Organization org = organization();
        if (StringUtils.hasText(req.getName())) org.setName(req.getName());
        if (req.getDomain() != null) org.setDomain(req.getDomain());
        if (StringUtils.hasText(req.getTimezone())) org.setTimezone(req.getTimezone());
        if (StringUtils.hasText(req.getPlan())) org.setPlan(req.getPlan());
        return OrganizationResponse.from(organizationRepository.save(org));
    }

    private Organization organization() {
        User user = currentUser.get();
        return user.getOrganization();
    }
}
