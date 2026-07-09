package com.presenza.backend.repository;

import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.WifiRouter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WifiRouterRepository extends JpaRepository<WifiRouter, Long> {
    List<WifiRouter> findByOrganization(Organization organization);
}
