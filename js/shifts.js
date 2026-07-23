document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('shiftsGrid');
  const timetableBody = document.getElementById('timetableBody');
  const banner = document.getElementById('appConnBanner');
  const addBtn = document.getElementById('addShiftBtn');

  let shifts = [];
  let geofences = [];

  function fmt(t) {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hour = ((+h + 11) % 12) + 1;
    return `${hour}:${m} ${+h < 12 ? 'AM' : 'PM'}`;
  }

  function geofenceOptions() {
    return geofences.map(g => ({ value: String(g.geofenceId), label: g.buildingName || ('Geofence #' + g.geofenceId) }));
  }

  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    banner.innerHTML = `<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>${escapeAppHtml(me.username)}</b> (${escapeAppHtml(me.role)})`;
  } catch (err) {
    banner.innerHTML = `<span class="ps-chip ps-chip-danger">Not connected</span> ${escapeAppHtml(err.message)}`;
    grid.innerHTML = `<div class="ps-empty">Couldn't connect to the app.</div>`;
    timetableBody.innerHTML = `<tr><td colspan="3" class="ps-empty">Couldn't connect to the app.</td></tr>`;
    return;
  }

  try { geofences = await AppStore.getGeofences(); } catch { /* non-fatal */ }

  async function loadShifts() {
    try {
      shifts = await AppStore.getShifts();
    } catch (err) {
      grid.innerHTML = `<div class="ps-empty">Couldn't load shifts (${escapeAppHtml(err.message)}).</div>`;
      return;
    }

    const shiftById = {};
    shifts.forEach(s => { shiftById[s.shiftId] = s; });

    grid.innerHTML = shifts.length ? shifts.map(s => `
      <div class="ps-stat-card" style="text-align:center;" data-shift-id="${s.shiftId}">
        <div class="shift-time">${fmt(s.startTime)} – ${fmt(s.endTime)}</div>
        <div class="shift-name">${escapeAppHtml(s.shiftName)}</div>
        <div class="shift-grace">Late allowance: ${s.allowedLateMinutes ?? '—'} min</div>
        <div class="shift-assigned">Geofence: ${s.geofenceId ?? 'None'}</div>
        <div class="shift-card-actions">
          <button class="ps-btn ps-btn-ghost ps-btn-sm btn-edit-shift" style="width:100%; justify-content:center;">Edit</button>
        </div>
      </div>
    `).join('') : `<div class="ps-empty">No shifts configured yet.</div>`;

    try {
      const employees = await AppStore.getAllEmployees();
      timetableBody.innerHTML = employees.length ? employees.map(e => {
        const shift = shiftById[e.shiftId];
        return `<tr>
          <td>${escapeAppHtml(e.employeeName)}</td>
          <td>${shift ? escapeAppHtml(shift.shiftName) : '—'}</td>
          <td>${shift ? `${fmt(shift.startTime)} – ${fmt(shift.endTime)}` : '-'}</td>
        </tr>`;
      }).join('') : `<tr><td colspan="3" class="ps-empty">No members yet.</td></tr>`;
    } catch (err) {
      if (err.status === 403) {
        timetableBody.innerHTML = `<tr><td colspan="3" class="ps-empty">Needs a manager/org-admin account on their side to view this.</td></tr>`;
      } else {
        timetableBody.innerHTML = `<tr><td colspan="3" class="ps-empty">Couldn't load the timetable (${escapeAppHtml(err.message)}).</td></tr>`;
      }
    }
  }

  await loadShifts();

  addBtn?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add shift',
      submitLabel: 'Add shift',
      fields: [
        { name: 'shiftName', label: 'Shift name', placeholder: 'e.g. General' },
        { name: 'startTime', label: 'Start time', type: 'time' },
        { name: 'endTime', label: 'End time', type: 'time' },
        { name: 'allowedLateMinutes', label: 'Allowed late minutes', type: 'number', value: '0' },
        { name: 'geofenceId', label: 'Geofence', type: 'select', options: geofenceOptions(), required: false },
      ],
      onSubmit: async (values) => {
        await AppStore.createShift(
          values.shiftName, values.startTime, values.endTime,
          Number(values.allowedLateMinutes || 0),
          values.geofenceId ? Number(values.geofenceId) : null
        );
        await loadShifts();
      },
    });
  });

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-shift');
    if (!btn) return;
    const card = btn.closest('[data-shift-id]');
    const shiftId = Number(card.dataset.shiftId);
    const s = shifts.find(x => x.shiftId === shiftId);
    if (!s) return;

    PSModal.open({
      title: 'Edit shift',
      submitLabel: 'Save changes',
      fields: [
        { name: 'shiftName', label: 'Shift name', value: s.shiftName },
        { name: 'startTime', label: 'Start time', type: 'time', value: s.startTime },
        { name: 'endTime', label: 'End time', type: 'time', value: s.endTime },
        { name: 'allowedLateMinutes', label: 'Allowed late minutes', type: 'number', value: String(s.allowedLateMinutes ?? 0) },
        { name: 'geofenceId', label: 'Geofence', type: 'select', options: geofenceOptions(), required: false, value: s.geofenceId != null ? String(s.geofenceId) : '' },
      ],
      onSubmit: async (values) => {
        await AppStore.updateShift(
          shiftId, values.shiftName, values.startTime, values.endTime,
          Number(values.allowedLateMinutes || 0),
          values.geofenceId ? Number(values.geofenceId) : null
        );
        await loadShifts();
      },
    });
  });
});
