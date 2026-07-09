package com.presenza.backend.repository;

import com.presenza.backend.entity.JoinCode;
import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JoinCodeRepository extends JpaRepository<JoinCode, Long> {
    Optional<JoinCode> findByCode(String code);
    List<JoinCode> findByOrganization(Organization organization);
    Optional<JoinCode> findByOrganizationAndRole(Organization organization, Role role);
}
