package com.presenza.backend.repository;

import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    List<Shift> findByOrganization(Organization organization);
}
