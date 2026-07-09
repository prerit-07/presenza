package com.presenza.backend.service;

import com.presenza.backend.dto.request.ZoneRequest;
import com.presenza.backend.dto.response.ZoneResponse;
import com.presenza.backend.entity.ActivityLog;
import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.Zone;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.ActivityLogRepository;
import com.presenza.backend.repository.ZoneRepository;
import com.presenza.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ZoneService {

    private final ZoneRepository zoneRepository;
    private final ActivityLogRepository activityLogRepository;
    private final CurrentUser currentUser;

    public List<ZoneResponse> list() {
        Organization org = currentUser.get().getOrganization();
        return zoneRepository.findByOrganization(org).stream().map(ZoneResponse::from).toList();
    }

    @Transactional
    public ZoneResponse create(ZoneRequest req) {
        Organization org = currentUser.get().getOrganization();
        Zone.ZoneBuilder builder = Zone.builder()
                .organization(org).name(req.getName())
                .latitude(req.getLatitude()).longitude(req.getLongitude());
        if (StringUtils.hasText(req.getRadius())) builder.radius(req.getRadius());
        if (StringUtils.hasText(req.getFloor())) builder.floor(req.getFloor());
        if (StringUtils.hasText(req.getVerification())) builder.verification(req.getVerification());
        Zone saved = zoneRepository.save(builder.build());
        activityLogRepository.save(ActivityLog.builder().organization(org)
                .text("Geofence zone \"" + saved.getName() + "\" created").build());
        return ZoneResponse.from(saved);
    }

    @Transactional
    public ZoneResponse update(Long id, ZoneRequest req) {
        Zone zone = ownedZone(id);
        if (StringUtils.hasText(req.getName())) zone.setName(req.getName());
        if (req.getLatitude() != null) zone.setLatitude(req.getLatitude());
        if (req.getLongitude() != null) zone.setLongitude(req.getLongitude());
        if (StringUtils.hasText(req.getRadius())) zone.setRadius(req.getRadius());
        if (StringUtils.hasText(req.getFloor())) zone.setFloor(req.getFloor());
        if (StringUtils.hasText(req.getVerification())) zone.setVerification(req.getVerification());
        return ZoneResponse.from(zoneRepository.save(zone));
    }

    @Transactional
    public void delete(Long id) {
        Zone zone = ownedZone(id);
        zoneRepository.delete(zone);
    }

    private Zone ownedZone(Long id) {
        Zone zone = zoneRepository.findById(id).orElseThrow(() -> ApiException.notFound("Zone not found."));
        if (!zone.getOrganization().getId().equals(currentUser.get().getOrganization().getId())) {
            throw ApiException.forbidden("Not your organization's zone.");
        }
        return zone;
    }
}
