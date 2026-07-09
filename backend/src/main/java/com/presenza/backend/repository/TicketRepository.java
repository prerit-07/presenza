package com.presenza.backend.repository;

import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByOrganizationOrderByCreatedAtDesc(Organization organization);
}
