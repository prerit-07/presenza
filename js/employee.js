document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('iconAttendance').innerHTML = psIcon('barChart', 20);
  document.getElementById('iconStreak').innerHTML    = psIcon('activity', 20);
  document.getElementById('iconLeave').innerHTML     = psIcon('fileText', 20);
  document.getElementById('iconVerif').innerHTML     = psIcon('mapPin', 20);

  // ---------- helpers ----------

  function fmt(timeStr) {
    if (!timeStr) return '-';
    // timeStr may be "09:01:00" → show "9:01"
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parts[1];
      return `${h}:${m}`;
    }
    return timeStr;
  }

  function chipClass(status) {
    if (!status) return 'ps-chip-danger';
    const s = status.toUpperCase();
    if (s === 'PRESENT') return 'ps-chip-success';
    if (s === 'LATE')    return 'ps-chip-warn';
    if (s === 'ON_LEAVE') return 'ps-chip-warn';
    return 'ps-chip-danger';
  }

  function chipLabel(status) {
    if (!status) return 'Absent';
    const s = status.toUpperCase();
    if (s === 'PRESENT')  return 'Present';
    if (s === 'LATE')     return 'Late';
    if (s === 'ON_LEAVE') return 'On Leave';
    return 'Absent';
  }

  // ---------- dashboard stats (real data, replacing old hardcoded values) ----------

  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = ((+h + 11) % 12) + 1;
    return `${hour}:${m} ${+h < 12 ? 'AM' : 'PM'}`;
  }

  async function loadDashboardStats() {
    let d;
    try {
      d = (await Store.get()).myDashboard;
    } catch (e) {
      return;
    }
    if (!d) return;

    document.getElementById('statAttendance').textContent = `${d.attendancePercent}%`;
    document.getElementById('statStreak').textContent = d.dayStreak;
    document.getElementById('statLeave').textContent = `${d.leavesRemaining}/${d.leavesEntitled}`;
    document.getElementById('statVerif').textContent = d.verificationMode;

    const sub = document.getElementById('checkinSub');
    if (d.shiftStart && d.shiftEnd) {
      sub.textContent = `Shift: ${d.shiftName} · ${fmtTime(d.shiftStart)} – ${fmtTime(d.shiftEnd)}`;
    } else {
      sub.textContent = d.shiftName || 'No shift assigned';
    }
  }

  await loadDashboardStats();

  // ---------- attendance history ----------

  async function loadHistory() {
    let records = [];
    try {
      records = (await Store.get()).attendanceMe || [];
    } catch (e) { /* leave empty */ }

    const body = document.getElementById('historyBody');
    if (!records.length) {
      body.innerHTML = '<tr><td colspan="5" class="ps-empty">No attendance records yet. Check in to get started!</td></tr>';
      return records;
    }

    body.innerHTML = records.slice(0, 10).map(r => {
      const dateStr = r.date || '-';
      const inTime  = fmt(r.checkIn);
      const outTime = fmt(r.checkOut);
      const zone    = r.zone || '-';
      const label   = chipLabel(r.status);
      const cls     = chipClass(r.status);
      return `<tr>
        <td>${dateStr}</td>
        <td>${inTime}</td>
        <td>${outTime}</td>
        <td>${zone}</td>
        <td><span class="ps-chip ${cls}">${label}</span></td>
      </tr>`;
    }).join('');

    return records;
  }

  // ---------- check-in state ----------

  const checkinBtn    = document.getElementById('checkinBtn');
  const checkinStatus = document.getElementById('checkinStatus');

  // Fetch today's record to determine if already checked in
  let todayRecord = null;
  try {
    const allRecords = (await Store.get()).attendanceMe || [];
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    todayRecord = allRecords.find(r => r.date === today) || null;
  } catch (e) { /* ignore */ }

  let checkedIn = !!(todayRecord && todayRecord.checkIn && !todayRecord.checkOut);

  if (checkedIn) {
    checkinStatus.textContent = `Checked in at ${fmt(todayRecord.checkIn)}`;
    checkinBtn.textContent = 'Check Out';
    checkinBtn.classList.add('checked-in');
  } else if (todayRecord && todayRecord.checkOut) {
    checkinStatus.textContent = `Checked out at ${fmt(todayRecord.checkOut)} — check in again any time today.`;
    checkinBtn.textContent = 'Check In';
    checkinBtn.disabled = false;
    checkinBtn.style.opacity = '1';
  }

  checkinBtn.addEventListener('click', async () => {
    if (checkinBtn.disabled) return;
    checkedIn = !checkedIn;
    checkinBtn.disabled = true;
    try {
      if (checkedIn) {
        const record = await Store.checkIn({ zone: 'Room 101', dualVerified: true });
        checkinStatus.textContent = `Checked in at ${fmt(record.checkIn)}`;
        checkinBtn.textContent = 'Check Out';
        checkinBtn.classList.add('checked-in');
        checkinBtn.disabled = false;
      } else {
        await Store.checkOut();
        checkinStatus.textContent = 'Checked out — check in again any time today.';
        checkinBtn.textContent = 'Check In';
        checkinBtn.classList.remove('checked-in');
        checkinBtn.disabled = false;
        checkinBtn.style.opacity = '1';
      }
      // Reload attendance history and stats to reflect the new record
      Store.invalidate?.();
      await loadHistory();
      await loadDashboardStats();
    } catch (e) {
      checkedIn = !checkedIn; // revert
      checkinBtn.disabled = false;
      checkinStatus.textContent = e.message || 'Something went wrong.';
    }
  });

  await loadHistory();

  // ---------- leave request ----------

  const leaveError   = document.getElementById('leaveError');
  const leaveSuccess = document.getElementById('leaveSuccess');

  document.getElementById('leaveSubmitBtn').addEventListener('click', async () => {
    leaveError.classList.remove('visible');
    leaveSuccess.classList.remove('visible');
    const from   = document.getElementById('leaveFrom').value;
    const to     = document.getElementById('leaveTo').value;
    const reason = document.getElementById('leaveReason').value.trim();

    if (!from || !to) {
      leaveError.textContent = 'Please select both from and to dates.';
      leaveError.classList.add('visible');
      return;
    }
    if (new Date(to) < new Date(from)) {
      leaveError.textContent = '"To" date cannot be before "From" date.';
      leaveError.classList.add('visible');
      return;
    }
    if (!reason) {
      leaveError.textContent = 'Please enter a reason for leave.';
      leaveError.classList.add('visible');
      return;
    }

    try {
      await Store.submitLeaveRequest({ fromDate: from, toDate: to, reason });
    } catch (e) {
      leaveError.textContent = e.message || 'Could not submit leave request.';
      leaveError.classList.add('visible');
      return;
    }

    leaveSuccess.classList.add('visible');
    document.getElementById('leaveFrom').value  = '';
    document.getElementById('leaveTo').value    = '';
    document.getElementById('leaveReason').value = '';
  });
});
