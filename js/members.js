document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.getElementById('membersTableBody');
  const banner = document.getElementById('appConnBanner');
  const addBtn = document.getElementById('addEmployeeBtn');

  let departments = [];
  let teams = [];
  let shifts = [];
  let employees = [];

  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    banner.innerHTML = `<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>${escapeAppHtml(me.username)}</b> (${escapeAppHtml(me.role)})`;
  } catch (err) {
    banner.innerHTML = `<span class="ps-chip ps-chip-danger">Not connected</span> ${escapeAppHtml(err.message)}`;
    tbody.innerHTML = `<tr><td colspan="7" class="ps-empty">Couldn't connect to the app.</td></tr>`;
    return;
  }

  function deptOptions() { return departments.map(d => ({ value: String(d.departmentId), label: d.departmentName })); }
  function teamOptions() { return teams.map(t => ({ value: String(t.teamId), label: t.teamName })); }
  function shiftOptions() { return shifts.map(s => ({ value: String(s.shiftId), label: s.shiftName })); }

  async function loadLookups() {
    try { departments = await AppStore.getDepartments(); } catch { /* non-fatal */ }
    try { teams = await AppStore.getTeams(); } catch { /* non-fatal */ }
    try { shifts = await AppStore.getShifts(); } catch { /* non-fatal */ }
  }

  async function loadEmployees() {
    const deptById = {}; departments.forEach(d => { deptById[d.departmentId] = d.departmentName; });
    const teamById = {}; teams.forEach(t => { teamById[t.teamId] = t.teamName; });
    const shiftById = {}; shifts.forEach(s => { shiftById[s.shiftId] = s.shiftName; });

    try {
      employees = await AppStore.getAllEmployees();
      tbody.innerHTML = employees.length ? employees.map(e => `
        <tr data-employee-id="${e.employeeId}">
          <td>${escapeAppHtml(e.employeeName)}</td>
          <td>${e.employeeId}</td>
          <td>${escapeAppHtml(e.dateOfJoining || '—')}</td>
          <td>${e.departmentId != null ? escapeAppHtml(deptById[e.departmentId] || ('#' + e.departmentId)) : '—'}</td>
          <td>${e.shiftId != null ? escapeAppHtml(shiftById[e.shiftId] || ('#' + e.shiftId)) : '—'}</td>
          <td>${e.teamId != null ? escapeAppHtml(teamById[e.teamId] || ('#' + e.teamId)) : '—'}</td>
          <td><button class="ps-btn ps-btn-ghost ps-btn-sm btn-edit-employee">Edit</button></td>
        </tr>
      `).join('') : `<tr><td colspan="7" class="ps-empty">No members yet.</td></tr>`;
    } catch (err) {
      if (err.status === 403) {
        tbody.innerHTML = `<tr><td colspan="7" class="ps-empty">Needs a manager/org-admin account on their side to view this.</td></tr>`;
      } else {
        tbody.innerHTML = `<tr><td colspan="7" class="ps-empty">Couldn't load members (${escapeAppHtml(err.message)}).</td></tr>`;
      }
    }
  }

  await loadLookups();
  await loadEmployees();

  addBtn?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add employee',
      subtitle: 'Creates a real employee on the app — they can log in with this email once they set a password via Forgot Password.',
      submitLabel: 'Add employee',
      fields: [
        { name: 'username', label: 'Username' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'employeeName', label: 'Full name' },
        { name: 'dateOfJoining', label: 'Date of joining', type: 'date' },
        { name: 'departmentId', label: 'Department', type: 'select', options: deptOptions(), required: false },
        { name: 'shiftId', label: 'Shift', type: 'select', options: shiftOptions(), required: false },
        { name: 'teamId', label: 'Team', type: 'select', options: teamOptions(), required: false },
      ],
      onSubmit: async (values) => {
        await AppStore.createEmployee(
          values.username, values.email, values.employeeName, values.dateOfJoining,
          values.departmentId ? Number(values.departmentId) : null,
          values.shiftId ? Number(values.shiftId) : null,
          values.teamId ? Number(values.teamId) : null
        );
        await loadEmployees();
      },
    });
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-employee');
    if (!btn) return;
    const row = btn.closest('tr');
    const employeeId = Number(row.dataset.employeeId);
    const emp = employees.find(x => x.employeeId === employeeId);
    if (!emp) return;

    PSModal.open({
      title: 'Edit employee',
      submitLabel: 'Save changes',
      fields: [
        { name: 'employeeName', label: 'Full name', value: emp.employeeName },
        { name: 'dateOfJoining', label: 'Date of joining', type: 'date', value: emp.dateOfJoining || '' },
        { name: 'departmentId', label: 'Department', type: 'select', options: deptOptions(), required: false, value: emp.departmentId != null ? String(emp.departmentId) : '' },
        { name: 'shiftId', label: 'Shift', type: 'select', options: shiftOptions(), required: false, value: emp.shiftId != null ? String(emp.shiftId) : '' },
        { name: 'teamId', label: 'Team', type: 'select', options: teamOptions(), required: false, value: emp.teamId != null ? String(emp.teamId) : '' },
      ],
      onSubmit: async (values) => {
        await AppStore.updateEmployee(employeeId, {
          orgId: emp.orgId,
          userId: emp.userId,
          employeeName: values.employeeName,
          dateOfJoining: values.dateOfJoining,
          departmentId: values.departmentId ? Number(values.departmentId) : null,
          shiftId: values.shiftId ? Number(values.shiftId) : null,
          teamId: values.teamId ? Number(values.teamId) : null,
        });
        await loadEmployees();
      },
    });
  });
});
