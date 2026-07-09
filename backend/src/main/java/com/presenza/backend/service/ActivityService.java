package com.presenza.backend.service;

import com.presenza.backend.dto.response.ActivityResponse;
import com.presenza.backend.entity.Organization;
import com.presenza.backend.repository.ActivityLogRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityLogRepository activityLogRepository;
    private final CurrentUser currentUser;

    public List<ActivityResponse> recent(int limit) {
        Organization org = currentUser.get().getOrganization();
        return activityLogRepository.findByOrganizationOrderByCreatedAtDesc(org, PageRequest.of(0, limit))
                .stream().map(ActivityResponse::from).toList();
    }
}
