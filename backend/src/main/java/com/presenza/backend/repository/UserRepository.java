package com.presenza.backend.repository;

import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.Role;
import com.presenza.backend.entity.Shift;
import com.presenza.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByOrganization(Organization organization);
    List<User> findByOrganizationAndRole(Organization organization, Role role);
    List<User> findByOrganizationAndShift(Organization organization, Shift shift);
    long countByShift(Shift shift);
}
