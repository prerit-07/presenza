document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('iconAttendance').innerHTML = psIcon('barChart', 20);
  document.getElementById('iconStreak').innerHTML    = psIcon('activity', 20);
  document.getElementById('iconLeave').innerHTML     = psIcon('fileText', 20);
  document.getElementById('iconVerif').innerHTML     = psIcon('mapPin', 20);

  const checkinBtn    = document.getElementById('checkinBtn');
  const checkinStatus = document.getElementById('checkinStatus');
  const checkinSub    = document.getElementById('checkinSub');
  const appBanner     = document.getElementById('appConnBanner');

  function fmtTimeShort(t) {
    if (!t) return '';
    const parts = t.split(':');
    const h = parts[0], m = parts[1];
    const hour = ((+h + 11) % 12) + 1;
    return hour + ':' + m + ' ' + (+h < 12 ? 'AM' : 'PM');
  }

  function chipClass(status) {
    const s = (status || '').toUpperCase();
    if (s === 'PRESENT') return 'ps-chip-success';
    if (s === 'LATE') return 'ps-chip-warn';
    return 'ps-chip-danger';
  }

  function isToday(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    return !isNaN(d) && d.toDateString() === new Date().toDateString();
  }

  function getOrCreateDeviceId() {
    let id = localStorage.getItem('presenzaAppDeviceId');
    if (!id) {
      id = 'website-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('presenzaAppDeviceId', id);
    }
    return id;
  }

  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    appBanner.innerHTML = '<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>' + escapeAppHtml(me.username) + '</b> (' + escapeAppHtml(me.role) + ')';
  } catch (err) {
    appBanner.innerHTML = '<span class="ps-chip ps-chip-danger">Not connected</span> ' + escapeAppHtml(err.message);
    checkinStatus.textContent = 'Not connected';
    checkinSub.textContent = err.message;
    return;
  }

  let myEmployee = null;
  let myShift = null;
  let myRecords = [];

  try { myEmployee = await AppStore.getMyEmployee(); } catch (e) { /* non-fatal */ }
  if (myEmployee && myEmployee.shiftId != null) {
    try { myShift = await AppStore.getShiftById(myEmployee.shiftId); } catch (e) { /* non-fatal */ }
  }
  try { myRecords = (await AppStore.getMyAttendance()) || []; } catch (e) { /* non-fatal */ }

  // ---------- hero: real check-in status + the one real check-in action ----------

  function todaysRecord() {
    return myRecords.find(r => isToday(r.checkinTime)) || null;
  }

  function renderHero() {
    const todayRecord = todaysRecord();
    if (myShift) {
      checkinSub.textContent = 'Shift: ' + (myShift.shiftName || ('#' + myShift.shiftId)) + ' · ' + fmtTimeShort(myShift.startTime) + ' – ' + fmtTimeShort(myShift.endTime);
    } else {
      checkinSub.textContent = 'No shift assigned';
    }

    if (todayRecord) {
      checkinStatus.textContent = 'Checked in at ' + new Date(todayRecord.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      checkinBtn.textContent = 'Checked In ✓';
      checkinBtn.classList.add('checked-in');
      checkinBtn.disabled = true;
    } else {
      checkinStatus.textContent = 'Not checked in yet';
      checkinBtn.textContent = 'Check In';
      checkinBtn.classList.remove('checked-in');
      checkinBtn.disabled = !myShift;
      if (!myShift) checkinStatus.textContent = 'No shift assigned — ask your admin to assign one before checking in.';
    }
  }

  renderHero();

  checkinBtn.addEventListener('click', () => {
    if (checkinBtn.disabled || !myShift) return;
    if (!navigator.geolocation) {
      checkinStatus.textContent = "Your browser doesn't support location — can't check in from here.";
      return;
    }
    checkinBtn.disabled = true;
    checkinBtn.textContent = 'Checking in…';

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await AppStore.employeeCheckIn(
          myShift.shiftId,
          getOrCreateDeviceId(),
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy
        );
        myRecords = (await AppStore.getMyAttendance()) || [];
        renderHero();
        await loadStats();
        await loadHistory();
      } catch (e) {
        checkinStatus.textContent = e.message || 'Check-in failed.';
        checkinBtn.disabled = false;
        checkinBtn.textContent = 'Check In';
      }
    }, () => {
      checkinStatus.textContent = 'Location permission denied — GPS is needed to verify check-in.';
      checkinBtn.disabled = false;
      checkinBtn.textContent = 'Check In';
    });
  });

  // ---------- stats: real attendance rate, streak, pending requests, verification mode ----------

  async function loadStats() {
    const total = myRecords.length;
    const goodCount = myRecords.filter(r => ['PRESENT', 'LATE'].includes((r.status || '').toUpperCase())).length;
    const rate = total ? Math.round((goodCount / total) * 100) : 0;
    document.getElementById('statAttendance').textContent = rate + '%';

    const goodDates = new Set(
      myRecords.filter(r => ['PRESENT', 'LATE'].includes((r.status || '').toUpperCase()) && r.checkinTime)
        .map(r => new Date(r.checkinTime).toDateString())
    );
    let streak = 0;
    let cursor = new Date();
    while (goodDates.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    document.getElementById('statStreak').textContent = streak;

    let pendingCount = 0;
    try {
      const attendanceReqs = (await AppStore.getMyAttendanceRequests()) || [];
      const deviceReqs = (await AppStore.getMyDeviceChangeRequests()) || [];
      pendingCount = attendanceReqs.filter(r => (r.status || '').toUpperCase() === 'PENDING').length
        + deviceReqs.filter(r => (r.status || '').toUpperCase() === 'PENDING').length;
    } catch (e) { /* non-fatal */ }
    document.getElementById('statLeave').textContent = pendingCount;

    try {
      const settings = await AppStore.getPresenceSettings();
      document.getElementById('statVerif').textContent = settings.requireTrustedWifi ? 'GPS + WiFi' : 'GPS only';
    } catch (e) {
      document.getElementById('statVerif').textContent = '—';
    }
  }

  await loadStats();

  // ---------- attendance history: real records ----------

  async function loadHistory() {
    const body = document.getElementById('historyBody');
    if (!myRecords.length) {
      body.innerHTML = '<tr><td colspan="5" class="ps-empty">No attendance records yet. Check in to get started!</td></tr>';
      return;
    }
    body.innerHTML = myRecords.slice(0, 10).map((r) => {
      const dateStr = r.checkinTime ? new Date(r.checkinTime).toLocaleDateString() : '-';
      const inTime = r.checkinTime ? new Date(r.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      const effTime = r.effectiveCheckinTime ? new Date(r.effectiveCheckinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      return '<tr>' +
        '<td>' + escapeAppHtml(dateStr) + '</td>' +
        '<td>' + escapeAppHtml(inTime) + '</td>' +
        '<td>' + escapeAppHtml(effTime) + '</td>' +
        '<td>' + (r.wifiVerified ? 'WiFi verified' : '—') + '</td>' +
        '<td><span class="ps-chip ' + chipClass(r.status) + '">' + escapeAppHtml(r.status || 'Absent') + '</span></td>' +
        '</tr>';
    }).join('');
  }

  await loadHistory();

  // ---------- leave / WFH request ----------

  const leaveError   = document.getElementById('leaveError');
  const leaveSuccess = document.getElementById('leaveSuccess');

  document.getElementById('leaveSubmitBtn').addEventListener('click', async () => {
    leaveError.classList.remove('visible');
    leaveSuccess.classList.remove('visible');
    const type   = document.getElementById('leaveType').value;
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
      leaveError.textContent = 'Please enter a reason.';
      leaveError.classList.add('visible');
      return;
    }

    try {
      await AppStore.createAttendanceRequest(type, from, to, reason);
    } catch (e) {
      leaveError.textContent = e.message || 'Could not submit request.';
      leaveError.classList.add('visible');
      return;
    }

    leaveSuccess.classList.add('visible');
    document.getElementById('leaveFrom').value = '';
    document.getElementById('leaveTo').value = '';
    document.getElementById('leaveReason').value = '';
    renderMyRequests();
    await loadStats();
  });

  // ---------- device change request ----------

  const deviceReqError = document.getElementById('deviceReqError');
  const deviceReqSuccess = document.getElementById('deviceReqSuccess');

  document.getElementById('deviceReqSubmitBtn').addEventListener('click', async () => {
    deviceReqError.classList.remove('visible');
    deviceReqSuccess.classList.remove('visible');
    const oldId = document.getElementById('deviceOldId').value.trim();
    const newId = document.getElementById('deviceNewId').value.trim();
    const reason = document.getElementById('deviceReason').value.trim();

    if (!oldId || !newId || !reason) {
      deviceReqError.textContent = 'Please fill in old device ID, new device ID, and reason.';
      deviceReqError.classList.add('visible');
      return;
    }

    try {
      await AppStore.createDeviceChangeRequest(oldId, newId, reason);
    } catch (e) {
      deviceReqError.textContent = e.message || 'Could not submit request.';
      deviceReqError.classList.add('visible');
      return;
    }

    deviceReqSuccess.classList.add('visible');
    document.getElementById('deviceOldId').value = '';
    document.getElementById('deviceNewId').value = '';
    document.getElementById('deviceReason').value = '';
    renderMyRequests();
    await loadStats();
  });

  // ---------- raise a ticket ----------

  const ticketError = document.getElementById('ticketError');
  const ticketSuccess = document.getElementById('ticketSuccess');

  document.getElementById('ticketSubmitBtn').addEventListener('click', async () => {
    ticketError.classList.remove('visible');
    ticketSuccess.classList.remove('visible');
    const subject = document.getElementById('ticketSubject').value.trim();
    const description = document.getElementById('ticketDescription').value.trim();

    if (!subject) {
      ticketError.textContent = 'Please enter a subject.';
      ticketError.classList.add('visible');
      return;
    }

    try {
      await AppStore.createTicket(subject, description);
    } catch (e) {
      ticketError.textContent = e.message || 'Could not raise ticket.';
      ticketError.classList.add('visible');
      return;
    }

    ticketSuccess.classList.add('visible');
    document.getElementById('ticketSubject').value = '';
    document.getElementById('ticketDescription').value = '';
    appRenderSection('myTicketsBody', AppStore.getMyTickets, renderTicketList);
  });

  // ---------- live app data: my employee info, teammates, tickets, requests ----------

  appRenderSection('myEmployeeBody', AppStore.getMyEmployee, (e) => (
    '<div class="ps-stat-grid" style="grid-template-columns: repeat(auto-fill, minmax(150px,1fr));">' +
    '<div class="ps-stat-card"><div class="ps-stat-value" style="font-size:15px;">' + escapeAppHtml(e.employeeName || '—') + '</div><div class="ps-stat-label">Name</div></div>' +
    '<div class="ps-stat-card"><div class="ps-stat-value" style="font-size:15px;">' + escapeAppHtml(e.dateOfJoining || '—') + '</div><div class="ps-stat-label">Joined</div></div>' +
    '<div class="ps-stat-card"><div class="ps-stat-value" style="font-size:15px;">' + (e.departmentId ?? '—') + '</div><div class="ps-stat-label">Department ID</div></div>' +
    '<div class="ps-stat-card"><div class="ps-stat-value" style="font-size:15px;">' + (e.shiftId ?? '—') + '</div><div class="ps-stat-label">Shift ID</div></div>' +
    '</div>'
  ));

  appRenderSection('myTeammatesBody', AppStore.getMyTeammates, (teammates) => {
    if (!teammates || !teammates.length) return '<div class="ps-empty">No teammates found.</div>';
    return teammates.map((t) => (
      '<div style="padding:8px 0; border-bottom:1px solid var(--surface-border); font-size:13px; font-weight:600;">' +
      escapeAppHtml(t.employeeName || t.name || ('Employee #' + t.employeeId)) +
      '</div>'
    )).join('');
  });

  function renderTicketList(tickets) {
    if (!tickets || !tickets.length) return '<div class="ps-empty">No tickets.</div>';
    return tickets.map((t) => (
      '<div style="padding:8px 0; border-bottom:1px solid var(--surface-border); font-size:13px;">' +
      '<b>' + escapeAppHtml(t.subject || t.title || 'Ticket') + '</b>' +
      '<span class="ps-chip ps-chip-warn" style="margin-left:8px;">' + escapeAppHtml(t.status || 'Open') + '</span>' +
      '</div>'
    )).join('');
  }
  appRenderSection('myTicketsBody', AppStore.getMyTickets, renderTicketList);

  async function renderMyRequests() {
    const el = document.getElementById('myRequestsBody');
    let attendanceReqs = [];
    let deviceReqs = [];
    try { attendanceReqs = (await AppStore.getMyAttendanceRequests()) || []; } catch (e) { /* non-fatal */ }
    try { deviceReqs = (await AppStore.getMyDeviceChangeRequests()) || []; } catch (e) { /* non-fatal */ }

    const rows = attendanceReqs.map((r) => ({ label: r.requestType || 'Attendance', status: r.status || 'Pending' }))
      .concat(deviceReqs.map((r) => ({ label: 'Device change', status: r.status || 'Pending' })));

    el.innerHTML = rows.length
      ? rows.map((r) => (
          '<div style="padding:8px 0; border-bottom:1px solid var(--surface-border); font-size:13px;">' +
          escapeAppHtml(r.label) + ' request' +
          '<span class="ps-chip ps-chip-warn" style="margin-left:8px;">' + escapeAppHtml(r.status) + '</span>' +
          '</div>'
        )).join('')
      : '<div class="ps-empty">No pending requests.</div>';
  }
  renderMyRequests();
});
