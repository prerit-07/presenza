document.addEventListener('DOMContentLoaded', async () => {
  const banner = document.getElementById('appConnBanner');
  const body = document.getElementById('attendanceBody');
  const statusFilter = document.getElementById('statusFilter');
  const addBtn = document.getElementById('addManualBtn');

  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    banner.innerHTML = `<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>${escapeAppHtml(me.username)}</b> (${escapeAppHtml(me.role)})`;
  } catch (err) {
    banner.innerHTML = `<span class="ps-chip ps-chip-danger">Not connected</span> ${escapeAppHtml(err.message)}`;
    body.innerHTML = `<tr><td colspan="6" class="ps-empty">Couldn't connect to the app.</td></tr>`;
    return;
  }

  const STATUS_OPTIONS = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'LATE', label: 'Late' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'REJECTED', label: 'Rejected' },
  ];
  const chipClass = { PRESENT: 'ps-chip-success', LATE: 'ps-chip-warn', PENDING: 'ps-chip-warn', ABSENT: 'ps-chip-danger', REJECTED: 'ps-chip-danger' };

  function fmtTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return isNaN(d) ? '-' : d.toLocaleString();
  }

  let employees = [];
  try { employees = await AppStore.getAllEmployees(); } catch { /* non-fatal */ }
  const employeeByUserId = {};
  employees.forEach(e => { employeeByUserId[e.userId] = e.employeeName; });
  function employeeOptions() { return employees.map(e => ({ value: String(e.employeeId), label: e.employeeName })); }

  let records = [];

  async function loadRecords() {
    try {
      records = (await AppStore.getAttendanceList()) || [];
    } catch (err) {
      body.innerHTML = err.status === 403
        ? `<tr><td colspan="6" class="ps-empty">Needs a manager/org-admin account on their side to view this.</td></tr>`
        : `<tr><td colspan="6" class="ps-empty">Couldn't load attendance (${escapeAppHtml(err.message)}).</td></tr>`;
      return;
    }
    render();
  }

  function render() {
    const filter = statusFilter.value;
    let rows = records;
    if (filter !== 'All status') {
      const filterKey = filter.toUpperCase().replace(' ', '_');
      rows = records.filter(r => (r.status || 'ABSENT').toUpperCase() === filterKey);
    }
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6" class="ps-empty">${records.length ? 'No records match this filter.' : 'No attendance records yet.'}</td></tr>`;
      return;
    }
    body.innerHTML = rows.map(r => {
      const status = (r.status || 'ABSENT').toUpperCase();
      const name = employeeByUserId[r.userId] || ('User #' + r.userId);
      return `<tr data-attendance-id="${r.attendanceId}">
        <td>${escapeAppHtml(name)}</td>
        <td>${escapeAppHtml(fmtTime(r.checkinTime))}</td>
        <td>${escapeAppHtml(fmtTime(r.effectiveCheckinTime))}</td>
        <td>${r.wifiVerified ? 'WiFi verified' : '—'}</td>
        <td><span class="ps-chip ${chipClass[status] || 'ps-chip-danger'}">${escapeAppHtml(status)}</span></td>
        <td><button class="ps-btn ps-btn-ghost ps-btn-sm btn-correct-attendance">Correct</button></td>
      </tr>`;
    }).join('');
  }

  statusFilter.addEventListener('change', render);
  await loadRecords();

  addBtn?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add manual attendance',
      submitLabel: 'Add record',
      fields: [
        { name: 'employeeId', label: 'Employee', type: 'select', options: employeeOptions() },
        { name: 'attendanceDate', label: 'Date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
        { name: 'remarks', label: 'Remarks', required: false },
      ],
      onSubmit: async (values) => {
        await AppStore.createManualAttendance(
          Number(values.employeeId), values.attendanceDate, values.status,
          new Date(values.attendanceDate).toISOString(), values.remarks || ''
        );
        await loadRecords();
      },
    });
  });

  body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-correct-attendance');
    if (!btn) return;
    const row = btn.closest('tr');
    const attendanceId = Number(row.dataset.attendanceId);
    const r = records.find(x => x.attendanceId === attendanceId);
    if (!r) return;

    PSModal.open({
      title: 'Correct attendance',
      submitLabel: 'Save',
      fields: [
        { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, value: r.status },
        { name: 'remarks', label: 'Remarks', value: r.remarks || '', required: false },
      ],
      onSubmit: async (values) => {
        await AppStore.correctAttendance(attendanceId, values.status, r.effectiveCheckinTime, values.remarks || '');
        await loadRecords();
      },
    });
  });

  document.getElementById('exportBtn')?.addEventListener('click', () => {
    const header = 'Name,Check-In,Effective Check-In,Status';
    const lines = records.map(r =>
      `${employeeByUserId[r.userId] || ''},${fmtTime(r.checkinTime)},${fmtTime(r.effectiveCheckinTime)},${r.status || ''}`
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
});
