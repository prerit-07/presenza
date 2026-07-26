document.addEventListener('DOMContentLoaded', async () => {
  const greetName = document.getElementById('ovGreetName');

  document.getElementById('iconMembers').innerHTML = psIcon('users', 20);
  document.getElementById('iconRate').innerHTML = psIcon('barChart', 20);
  document.getElementById('iconPendingLeave').innerHTML = psIcon('fileText', 20);
  document.getElementById('iconPendingTickets').innerHTML = psIcon('ticket', 20);
  document.getElementById('iconPresent').innerHTML = psIcon('checkSquare', 20);
  document.getElementById('iconLate').innerHTML = psIcon('clock', 20);
  document.getElementById('iconAbsent').innerHTML = psIcon('fileText', 20);
  document.getElementById('iconZones').innerHTML = psIcon('mapPin', 20);
  document.getElementById('iconRouters').innerHTML = psIcon('wifi', 20);
  document.getElementById('iconCodes').innerHTML = psIcon('ticket', 20);
  document.getElementById('qlMembers').innerHTML = psIcon('users', 20);
  document.getElementById('qlZone').innerHTML = psIcon('mapPin', 20);
  document.getElementById('qlRouter').innerHTML = psIcon('wifi', 20);
  const qlCodesEl = document.getElementById('qlCodes'); if (qlCodesEl) qlCodesEl.innerHTML = psIcon('ticket', 20);
  document.getElementById('qlTeam').innerHTML = psIcon('usersGroup', 20);

  let me, employees = [], geofences = [], attendance = [], pendingAttendanceRequests = [],
      pendingDeviceRequests = [], orgTickets = [];

  try {
    await appEnsureToken();
    me = await AppStore.getMe();
  } catch (err) {
    document.querySelectorAll('.ps-stat-value').forEach(el => el.textContent = '—');
    document.getElementById('alertsList').innerHTML = `<div class="ps-empty">Couldn't connect to the app (${escapeAppHtml(err.message)}).</div>`;
    document.getElementById('approvalsList').innerHTML = `<div class="ps-empty">Couldn't connect to the app.</div>`;
    document.getElementById('activityList').innerHTML = `<div class="ps-empty">Couldn't connect to the app.</div>`;
    return;
  }

  if (greetName) greetName.textContent = me.username || 'there';

  try { employees = await AppStore.getAllEmployees(); } catch { /* non-fatal */ }
  try { geofences = await AppStore.getGeofences(); } catch { /* non-fatal */ }
  try { attendance = await AppStore.getAttendanceList(); } catch { /* non-fatal */ }
  try { pendingAttendanceRequests = await AppStore.getPendingAttendanceRequests(); } catch { /* non-fatal */ }
  try { pendingDeviceRequests = await AppStore.getPendingDeviceChangeRequests(); } catch { /* non-fatal */ }
  try { orgTickets = await AppStore.getOrganizationTickets(); } catch { /* non-fatal */ }

  let wifiCount = 0;
  for (const g of geofences) {
    try { wifiCount += (await AppStore.getWifiNetworksForGeofence(g.geofenceId)).length; } catch { /* skip */ }
  }

  function isToday(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return !isNaN(d) && d.toDateString() === now.toDateString();
  }

  const todaysRecords = attendance.filter(r => isToday(r.checkinTime));
  const presentToday = todaysRecords.filter(r => (r.status || '').toUpperCase() === 'PRESENT').length;
  const lateToday = todaysRecords.filter(r => (r.status || '').toUpperCase() === 'LATE').length;
  const employeesWithShift = employees.filter(e => e.shiftId != null).length;
  const absentToday = Math.max(0, employeesWithShift - presentToday - lateToday);
  const attendanceRateToday = employeesWithShift ? Math.round(((presentToday + lateToday) / employeesWithShift) * 100) : 0;
  const openTickets = orgTickets.filter(t => ['OPEN', 'REOPENED'].includes((t.status || '').toUpperCase()));

  document.getElementById('statMembers').textContent = employees.length;
  document.getElementById('statRate').textContent = `${attendanceRateToday}%`;
  document.getElementById('statPendingLeave').textContent = pendingAttendanceRequests.length;
  document.getElementById('statPendingTickets').textContent = openTickets.length;
  document.getElementById('statPresentToday').textContent = presentToday;
  document.getElementById('statLateToday').textContent = lateToday;
  document.getElementById('statAbsentToday').textContent = absentToday;
  document.getElementById('statZones').textContent = geofences.length;
  document.getElementById('statRouters').textContent = wifiCount;
  document.getElementById('statCodes').textContent = pendingDeviceRequests.length;

  // ---------- needs attention: open support tickets ----------
  const alertsList = document.getElementById('alertsList');
  alertsList.innerHTML = openTickets.slice(0, 5).map(t => `
    <div class="alert-row">
      <div>
        <div class="alert-name">${escapeAppHtml(t.subject || 'Ticket #' + t.ticketId)}</div>
        <div class="alert-detail">${escapeAppHtml(t.description || '')}</div>
      </div>
      <span class="ps-chip ps-chip-warn">${escapeAppHtml(t.status || 'OPEN')}</span>
    </div>
  `).join('') || '<div class="ps-empty">Nothing needs attention right now.</div>';

  // ---------- pending approvals: attendance + device change requests ----------
  const approvalsList = document.getElementById('approvalsList');
  const employeeByUserId = {}; employees.forEach(e => { employeeByUserId[e.userId] = e.employeeName; });

  function renderApprovals() {
    if (!pendingAttendanceRequests.length && !pendingDeviceRequests.length) {
      approvalsList.innerHTML = '<div class="ps-empty">Nothing pending — you\'re all caught up.</div>';
      return;
    }

    approvalsList.innerHTML = [
      ...pendingAttendanceRequests.slice(0, 5).map(r => `
        <div class="approval-row" data-attendance-request-id="${r.requestId}">
          <div class="approval-info">
            <div><b>${escapeAppHtml(r.employeeName || 'Employee #' + r.employeeId)}</b> requested ${escapeAppHtml(r.requestType || 'leave')}</div>
            <div class="approval-sub">${escapeAppHtml(r.startDate || '')} → ${escapeAppHtml(r.endDate || '')} · ${escapeAppHtml(r.reason || 'No reason given')}</div>
          </div>
          <div class="approval-actions">
            <button class="ps-btn ps-btn-primary ps-btn-sm" data-approve-attendance="${r.requestId}">Approve</button>
            <button class="ps-btn ps-btn-danger ps-btn-sm" data-reject-attendance="${r.requestId}">Reject</button>
          </div>
        </div>
      `),
      ...pendingDeviceRequests.slice(0, 5).map(r => `
        <div class="approval-row" data-device-request-id="${r.requestId}">
          <div class="approval-info">
            <div><b>${escapeAppHtml(employeeByUserId[r.userId] || 'User #' + r.userId)}</b> requested a device change</div>
            <div class="approval-sub">${escapeAppHtml(r.oldDeviceId || '—')} → ${escapeAppHtml(r.newDeviceId || '—')}</div>
          </div>
          <div class="approval-actions">
            <button class="ps-btn ps-btn-primary ps-btn-sm" data-approve-device="${r.requestId}">Approve</button>
            <button class="ps-btn ps-btn-danger ps-btn-sm" data-reject-device="${r.requestId}">Reject</button>
          </div>
        </div>
      `)
    ].join('');

    approvalsList.querySelectorAll('[data-approve-attendance]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await AppStore.reviewAttendanceRequest(Number(btn.dataset.approveAttendance), true, 'Approved from Overview');
        pendingAttendanceRequests = pendingAttendanceRequests.filter(r => r.requestId !== Number(btn.dataset.approveAttendance));
        renderApprovals();
      });
    });
    approvalsList.querySelectorAll('[data-reject-attendance]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await AppStore.reviewAttendanceRequest(Number(btn.dataset.rejectAttendance), false, 'Rejected from Overview');
        pendingAttendanceRequests = pendingAttendanceRequests.filter(r => r.requestId !== Number(btn.dataset.rejectAttendance));
        renderApprovals();
      });
    });
    approvalsList.querySelectorAll('[data-approve-device]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await AppStore.reviewDeviceChangeRequest(Number(btn.dataset.approveDevice), true);
        pendingDeviceRequests = pendingDeviceRequests.filter(r => r.requestId !== Number(btn.dataset.approveDevice));
        renderApprovals();
      });
    });
    approvalsList.querySelectorAll('[data-reject-device]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await AppStore.reviewDeviceChangeRequest(Number(btn.dataset.rejectDevice), false);
        pendingDeviceRequests = pendingDeviceRequests.filter(r => r.requestId !== Number(btn.dataset.rejectDevice));
        renderApprovals();
      });
    });
  }

  renderApprovals();

  // ---------- recent activity: latest requests + tickets, merged ----------
  function pickIcon(kind) {
    if (kind === 'device') return 'wifi';
    if (kind === 'ticket') return 'ticket';
    return 'fileText';
  }

  const activityItems = [
    ...pendingAttendanceRequests.map(r => ({ kind: 'attendance', time: r.createdAt, text: `${r.employeeName || 'Employee #' + r.employeeId} requested ${r.requestType || 'leave'}` })),
    ...pendingDeviceRequests.map(r => ({ kind: 'device', time: r.requestedAt, text: `${employeeByUserId[r.userId] || 'User #' + r.userId} requested a device change` })),
    ...orgTickets.map(t => ({ kind: 'ticket', time: t.createdAt, text: `Ticket raised: ${t.subject || '#' + t.ticketId}` })),
  ].filter(a => a.time).sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

  const list = document.getElementById('activityList');
  list.innerHTML = activityItems.map(item => `
    <div class="activity-row">
      <div class="activity-row-left">
        <div class="activity-icon">${psIcon(pickIcon(item.kind), 16)}</div>
        <div class="activity-text">${escapeAppHtml(item.text)}</div>
      </div>
      <div class="activity-time">${new Date(item.time).toLocaleString()}</div>
    </div>
  `).join('') || '<div class="ps-empty">No recent activity yet.</div>';
});
