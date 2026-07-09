package com.presenza.backend.repository;

import com.presenza.backend.entity.AttendanceRecord;
import com.presenza.backend.entity.AttendanceStatus;
import com.presenza.backend.entity.Organization;
import com.presenza.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByOrganizationAndDate(Organization organization, LocalDate date);
    List<AttendanceRecord> findByUser(User user);
    Optional<AttendanceRecord> findByUserAndDate(User user, LocalDate date);
    long countByUserAndStatusIn(User user, Collection<AttendanceStatus> statuses);
    List<AttendanceRecord> findByOrganizationAndDateBetweenOrderByDateAsc(Organization organization, LocalDate from, LocalDate to);
}
