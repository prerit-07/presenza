document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('shiftsGrid');
  const timetableBody = document.getElementById('timetableBody');

  let shifts = [];
  let timetable = [];

  function fmt(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = ((+h + 11) % 12) + 1;
    return `${hour}:${m} ${+h < 12 ? 'AM' : 'PM'}`;
  }

  async function renderShifts() {
    shifts = await Store.listShifts();
    grid.innerHTML = shifts.map(s => `
      <div class="ps-stat-card" style="text-align:center;">
        <div class="shift-time">${fmt(s.startTime)} – ${fmt(s.endTime)}</div>
        <div class="shift-name">${s.name}</div>
        <div class="shift-grace">Grace period: ${s.graceMinutes} min</div>
        <div class="shift-assigned">${s.assignedCount} member${s.assignedCount === 1 ? '' : 's'} assigned</div>
        <div class="shift-card-actions">
          <button class="ps-btn ps-btn-ghost ps-btn-sm" data-edit="${s.id}">Edit</button>
          <button class="ps-btn ps-btn-ghost ps-btn-sm" data-delete="${s.id}">Delete</button>
        </div>
      </div>
    `).join('') || `<div class="ps-empty">No shifts configured yet.</div>`;

    grid.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this shift? Members on it will be unassigned.')) return;
        await Store.deleteShift(btn.dataset.delete);
        renderShifts();
        renderTimetable();
      });
    });

    grid.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openShiftModal(shifts.find(s => String(s.id) === btn.dataset.edit)));
    });
  }

  async function renderTimetable() {
    timetable = await Store.getTimetable();
    timetableBody.innerHTML = timetable.map(t => `
      <tr>
        <td>${t.name}</td>
        <td>${t.title}</td>
        <td>${t.shiftName}</td>
        <td>${t.startTime ? fmt(t.startTime) + ' – ' + fmt(t.endTime) : '-'}</td>
        <td>${t.days || '-'}</td>
        <td><button class="ps-btn ps-btn-ghost ps-btn-sm" data-assign="${t.userId}">Assign</button></td>
      </tr>
    `).join('') || `<tr><td colspan="6" class="ps-empty">No members yet.</td></tr>`;

    timetableBody.querySelectorAll('[data-assign]').forEach(btn => {
      btn.addEventListener('click', () => openAssignModal(btn.dataset.assign));
    });
  }

  function openShiftModal(existing) {
    PSModal.open({
      title: existing ? 'Edit shift' : 'Add shift',
      subtitle: 'Working hours and grace period before a check-in counts as late.',
      submitLabel: existing ? 'Save changes' : 'Add shift',
      fields: [
        { name: 'name', label: 'Shift name', placeholder: 'e.g. Morning Shift', value: existing?.name },
        { name: 'startTime', label: 'Start time', type: 'time', value: existing?.startTime },
        { name: 'endTime', label: 'End time', type: 'time', value: existing?.endTime },
        { name: 'days', label: 'Days (comma-separated)', placeholder: 'MON,TUE,WED,THU,FRI', required: false, value: existing?.days },
        { name: 'graceMinutes', label: 'Grace period (minutes)', type: 'number', placeholder: '15', required: false, value: existing?.graceMinutes }
      ],
      onSubmit: async (values) => {
        const payload = {
          name: values.name,
          startTime: values.startTime,
          endTime: values.endTime,
          days: values.days || undefined,
          graceMinutes: values.graceMinutes ? Number(values.graceMinutes) : undefined
        };
        if (existing) await Store.updateShift(existing.id, payload);
        else await Store.addShift(payload);
        renderShifts();
        renderTimetable();
      }
    });
  }

  function openAssignModal(userId) {
    PSModal.open({
      title: 'Assign shift',
      subtitle: 'Pick a shift for this member, or Unassigned to clear it.',
      submitLabel: 'Assign',
      fields: [
        { name: 'shiftId', label: 'Shift', type: 'select', options: [
            { value: '', label: 'Unassigned' },
            ...shifts.map(s => ({ value: String(s.id), label: `${s.name} (${fmt(s.startTime)} – ${fmt(s.endTime)})` }))
          ], required: false }
      ],
      onSubmit: async (values) => {
        await Store.assignShift(userId, values.shiftId ? Number(values.shiftId) : null);
        renderShifts();
        renderTimetable();
      }
    });
  }

  document.getElementById('addShiftBtn')?.addEventListener('click', () => openShiftModal(null));

  await renderShifts();
  await renderTimetable();
});
