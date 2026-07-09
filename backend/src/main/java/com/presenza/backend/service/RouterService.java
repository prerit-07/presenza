package com.presenza.backend.service;

import com.presenza.backend.dto.request.RouterRequest;
import com.presenza.backend.dto.response.RouterResponse;
import com.presenza.backend.entity.ActivityLog;
import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.WifiRouter;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.ActivityLogRepository;
import com.presenza.backend.repository.WifiRouterRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RouterService {

    private final WifiRouterRepository wifiRouterRepository;
    private final ActivityLogRepository activityLogRepository;
    private final CurrentUser currentUser;

    public List<RouterResponse> list() {
        Organization org = currentUser.get().getOrganization();
        return wifiRouterRepository.findByOrganization(org).stream().map(RouterResponse::from).toList();
    }

    @Transactional
    public RouterResponse create(RouterRequest req) {
        Organization org = currentUser.get().getOrganization();
        WifiRouter.WifiRouterBuilder builder = WifiRouter.builder()
                .organization(org).zone(req.getZone()).ssid(req.getSsid()).bssid(req.getBssid())
                .registeredBy(StringUtils.hasText(req.getRegisteredBy()) ? req.getRegisteredBy() : currentUser.get().getName());
        if (StringUtils.hasText(req.getStatus())) builder.status(req.getStatus());
        WifiRouter saved = wifiRouterRepository.save(builder.build());
        activityLogRepository.save(ActivityLog.builder().organization(org)
                .text("Router \"" + saved.getSsid() + "\" registered for " + saved.getZone()).build());
        return RouterResponse.from(saved);
    }

    @Transactional
    public RouterResponse update(Long id, RouterRequest req) {
        WifiRouter router = owned(id);
        if (StringUtils.hasText(req.getZone())) router.setZone(req.getZone());
        if (StringUtils.hasText(req.getSsid())) router.setSsid(req.getSsid());
        if (StringUtils.hasText(req.getBssid())) router.setBssid(req.getBssid());
        if (StringUtils.hasText(req.getStatus())) router.setStatus(req.getStatus());
        return RouterResponse.from(wifiRouterRepository.save(router));
    }

    @Transactional
    public void delete(Long id) {
        wifiRouterRepository.delete(owned(id));
    }

    private WifiRouter owned(Long id) {
        WifiRouter router = wifiRouterRepository.findById(id).orElseThrow(() -> ApiException.notFound("Router not found."));
        if (!router.getOrganization().getId().equals(currentUser.get().getOrganization().getId())) {
            throw ApiException.forbidden("Not your organization's router.");
        }
        return router;
    }
}
