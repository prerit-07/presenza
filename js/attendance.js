document.addEventListener('DOMContentLoaded', async () => {
  // Show today's date on the date button
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
  document.getElementById('dateBtn').innerHTML = `${psIcon('calendar', 15)} ${dateLabel}`;

  const chipClass = {
    PRESENT: 'ps-chip-success',
    LATE: 'ps-chip-warn',
    ON_LEAVE: 'ps-chip-warn',
    ABSENT: 'ps-chip-danger'
  };

  function chipLabel(status) {
    if (!status) return 'Absent';
    const s = status.toUpperCase();
    if (s === 'PRESENT')  return 'Present';
    if (s === 'LATE')     return 'Late';
    if (s === 'ON_LEAVE') return 'On Leave';
    return 'Absent';
  }

  function fmt(t) {
    if (!t) return '-';
    const parts = t.split(':');
    if (parts.length >= 2) return `${parseInt(parts[0], 10)}:${parts[1]}`;
    return t;
  }

  // Fetch today's records from the API
  let records = [];
  try {
    // /attendance returns today's records by default
    const raw = (await Store.get()).attendanceToday || [];
    records = raw;
  } catch (e) { /* fallback to empty */ }

  const body = document.getElementById('attendanceBody');
  const statusFilter = document.getElementById('statusFilter');

  function render() {
    const filter = statusFilter.value;
    let rows = records;
    if (filter !== 'All status') {
      const filterKey = filter.toUpperCase().replace(' ', '_');
      rows = records.filter(r => (r.status || 'ABSENT').toUpperCase() === filterKey);
    }

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6" class="ps-empty">${records.length ? 'No records match this filter.' : 'No check-ins recorded today yet.'}</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(r => {
      const status = (r.status || 'ABSENT').toUpperCase();
      const label  = chipLabel(status);
      const cls    = chipClass[status] || 'ps-chip-danger';
      return `<tr>
        <td>${r.userName || r.name || '-'}</td>
        <td>${fmt(r.checkIn)}</td>
        <td>${fmt(r.checkOut)}</td>
        <td>${r.zone || '-'}</td>
        <td><span class="ps-chip ${cls}">${label}</span></td>
        <td></td>
      </tr>`;
    }).join('');
  }

  statusFilter.addEventListener('change', render);
  render();

  document.getElementById('exportBtn')?.addEventListener('click', () => {
    const header = 'Name,Check-In,Check-Out,Zone,Status';
    const lines  = records.map(r =>
      `${r.userName || r.name || ''},${fmt(r.checkIn)},${fmt(r.checkOut)},${r.zone || ''},${chipLabel(r.status)}`
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // ---------- date-range report (backed by /api/attendance/report and /export) ----------
  const reportFrom = document.getElementById('reportFrom');
  const reportTo = document.getElementById('reportTo');
  const reportBody = document.getElementById('reportBody');

  const iso = (d) => d.toISOString().slice(0, 10);
  const now = new Date();
  reportTo.value = iso(now);
  reportFrom.value = iso(new Date(now.getFullYear(), now.getMonth(), 1));

  async function renderReport() {
    if (!reportFrom.value || !reportTo.value) return;
    const rows = await Store.getAttendanceReport(reportFrom.value, reportTo.value);
    reportBody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.name}</td>
        <td>${r.presentDays}</td>
        <td>${r.lateDays}</td>
        <td>${r.onLeaveDays}</td>
        <td>${r.absentDays}</td>
        <td>${r.workingDays}</td>
        <td>${r.attendanceRate}%</td>
      </tr>
    `).join('') || `<tr><td colspan="7" class="ps-empty">No data for this range.</td></tr>`;
  }

  document.getElementById('reportViewBtn')?.addEventListener('click', renderReport);
  document.getElementById('reportExportBtn')?.addEventListener('click', () => {
    if (!reportFrom.value || !reportTo.value) return;
    Store.exportAttendanceCsv(reportFrom.value, reportTo.value);
  });

  renderReport();
});