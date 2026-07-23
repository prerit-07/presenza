document.addEventListener('DOMContentLoaded', async () => {
  const card = document.getElementById('teamCard');
  const deptCard = document.getElementById('deptCard');
  const banner = document.getElementById('appConnBanner');
  const addTeamBtn = document.getElementById('addTeamBtn');
  const addDeptBtn = document.getElementById('addDeptBtn');

  let employees = [];
  let teams = [];
  let departments = [];

  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    banner.innerHTML = `<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>${escapeAppHtml(me.username)}</b> (${escapeAppHtml(me.role)})`;
  } catch (err) {
    banner.innerHTML = `<span class="ps-chip ps-chip-danger">Not connected</span> ${escapeAppHtml(err.message)}`;
    card.innerHTML = `<div class="ps-empty">Couldn't connect to the app.</div>`;
    return;
  }

  try { employees = await AppStore.getAllEmployees(); } catch { /* non-fatal */ }
  const employeeById = {}; employees.forEach(e => { employeeById[e.employeeId] = e.employeeName; });

  function employeeOptions() {
    return employees.map(e => ({ value: String(e.employeeId), label: e.employeeName }));
  }

  async function loadTeams() {
    try {
      teams = await AppStore.getTeams();
      card.innerHTML = teams.length ? teams.map(t => {
        const memberCount = employees.filter(e => e.teamId === t.teamId).length;
        const managerName = t.managerEmployeeId != null ? (employeeById[t.managerEmployeeId] || `#${t.managerEmployeeId}`) : 'Unassigned';
        return `
          <div class="team-member-row" data-team-id="${t.teamId}">
            <div class="team-avatar">${escapeAppHtml((t.teamName || 'T').slice(0, 2).toUpperCase())}</div>
            <div style="flex:1;">
              <div class="team-name">${escapeAppHtml(t.teamName || 'Team #' + t.teamId)}</div>
              <div class="team-role">Manager: ${escapeAppHtml(managerName)} · ${memberCount} member${memberCount === 1 ? '' : 's'}</div>
            </div>
            <button class="ps-btn ps-btn-ghost ps-btn-sm btn-edit-team">Edit</button>
          </div>`;
      }).join('') : '<div class="ps-empty">No teams configured yet.</div>';
    } catch (err) {
      if (err.status === 403) {
        card.innerHTML = `<div class="ps-empty">Needs a manager/org-admin account on their side to view this.</div>`;
      } else {
        card.innerHTML = `<div class="ps-empty">Couldn't load teams (${escapeAppHtml(err.message)}).</div>`;
      }
    }
  }

  async function loadDepartments() {
    try {
      departments = await AppStore.getDepartments();
      deptCard.innerHTML = departments.length ? departments.map(d => {
        const memberCount = employees.filter(e => e.departmentId === d.departmentId).length;
        return `
          <div class="team-member-row" data-department-id="${d.departmentId}">
            <div class="team-avatar">${escapeAppHtml((d.departmentName || 'D').slice(0, 2).toUpperCase())}</div>
            <div style="flex:1;">
              <div class="team-name">${escapeAppHtml(d.departmentName || 'Department #' + d.departmentId)}</div>
              <div class="team-role">${memberCount} member${memberCount === 1 ? '' : 's'}</div>
            </div>
            <button class="ps-btn ps-btn-ghost ps-btn-sm btn-edit-dept">Edit</button>
          </div>`;
      }).join('') : '<div class="ps-empty">No departments configured yet.</div>';
    } catch (err) {
      deptCard.innerHTML = `<div class="ps-empty">Couldn't load departments (${escapeAppHtml(err.message)}).</div>`;
    }
  }

  await loadTeams();
  await loadDepartments();

  addTeamBtn?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add team',
      submitLabel: 'Add team',
      fields: [
        { name: 'teamName', label: 'Team name', placeholder: 'e.g. Field Ops' },
        { name: 'managerEmployeeId', label: 'Manager', type: 'select', options: employeeOptions(), required: false },
      ],
      onSubmit: async (values) => {
        await AppStore.createTeam(values.teamName, values.managerEmployeeId ? Number(values.managerEmployeeId) : null);
        await loadTeams();
      },
    });
  });

  card.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-team');
    if (!btn) return;
    const row = btn.closest('[data-team-id]');
    const teamId = Number(row.dataset.teamId);
    const t = teams.find(x => x.teamId === teamId);
    if (!t) return;

    PSModal.open({
      title: 'Edit team',
      submitLabel: 'Save changes',
      fields: [
        { name: 'teamName', label: 'Team name', value: t.teamName },
        { name: 'managerEmployeeId', label: 'Manager', type: 'select', options: employeeOptions(), required: false, value: t.managerEmployeeId != null ? String(t.managerEmployeeId) : '' },
      ],
      onSubmit: async (values) => {
        await AppStore.updateTeam(teamId, values.teamName, values.managerEmployeeId ? Number(values.managerEmployeeId) : null);
        await loadTeams();
      },
    });
  });

  addDeptBtn?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add department',
      submitLabel: 'Add department',
      fields: [
        { name: 'departmentName', label: 'Department name', placeholder: 'e.g. Engineering' },
      ],
      onSubmit: async (values) => {
        await AppStore.createDepartment(values.departmentName);
        await loadDepartments();
      },
    });
  });

  deptCard.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-dept');
    if (!btn) return;
    const row = btn.closest('[data-department-id]');
    const departmentId = Number(row.dataset.departmentId);
    const d = departments.find(x => x.departmentId === departmentId);
    if (!d) return;

    PSModal.open({
      title: 'Edit department',
      submitLabel: 'Save changes',
      fields: [
        { name: 'departmentName', label: 'Department name', value: d.departmentName },
      ],
      onSubmit: async (values) => {
        await AppStore.updateDepartment(departmentId, values.departmentName);
        await loadDepartments();
      },
    });
  });
});
