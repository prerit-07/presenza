/* ============================================================
   Presenza shared data layer — backed by the real Spring Boot REST API.

   Async rewrite note: this used to use synchronous XMLHttpRequest calls
   (one request at a time, blocking the tab) so that every page script
   could call Store.get() and get an instant return value. That made
   every page load pay the full round-trip latency of ~9 sequential
   HTTP calls back to back.

   Now every Store method that talks to the network returns a Promise,
   and fetchAll() fires its independent requests in parallel via
   Promise.all. Every page script has been updated to `await Store.get()`
   (and await any Store.* mutator it calls) inside an async function.
   ============================================================ */

const Store = (() => {
  const API_BASE = window.PRESENZA_API_BASE || 'http://localhost:8080/api';
  const TOKEN_KEY = 'presenzaToken';
  const SESSION_KEY = 'presenzaSession';

  let cache = null; // a Promise for the full aggregated data object, invalidated after mutations

  // ---------- low-level HTTP ----------

  async function request(method, path, body) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new Error('Could not reach the Presenza server. Is the backend running?');
    }

    let parsed = null;
    const text = await res.text();
    if (text) {
      try { parsed = JSON.parse(text); } catch (e) { /* non-JSON response */ }
    }

    if (!res.ok) {
      const message = (parsed && parsed.message) || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return parsed;
  }

  async function safe(fn, fallback) {
    try { return await fn(); } catch (e) { console.warn('Presenza API call failed:', e.message); return fallback; }
  }

  // ---------- session ----------

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveAuth(authResponse) {
    localStorage.setItem(TOKEN_KEY, authResponse.token);
    const session = {
      role: authResponse.role.toLowerCase(),
      name: authResponse.name,
      userId: authResponse.userId,
      email: authResponse.email,
      organizationId: authResponse.organizationId,
      organizationName: authResponse.organizationName
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    cache = null;
    return session;
  }

  // ---------- mappers ----------

  function timeAgo(iso) {
    if (!iso) return '-';
    const then = new Date(iso).getTime();
    if (isNaN(then)) return iso;
    const diffMs = Date.now() - then;
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.round(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  function mapCodes(list) {
    const manager = list.find(c => c.role === 'MANAGER');
    const employee = list.find(c => c.role === 'EMPLOYEE');
    return {
      manager: manager ? manager.code : '',
      managerId: manager ? manager.id : null,
      employee: employee ? employee.code : '',
      employeeId: employee ? employee.id : null,
      expiry: (manager || employee || {}).expiry || 'Never',
      maxUses: (manager || employee || {}).maxUses || 'Unlimited'
    };
  }

  // ---------- aggregate fetch ----------

  const emptyDashboard = { attendancePercent: 0, dayStreak: 0, leavesRemaining: 0, leavesEntitled: 0,
    verificationMode: 'GPS + WiFi', shiftName: 'No shift assigned', shiftStart: null, shiftEnd: null, shiftDays: null };

  async function fetchAll() {
    const session = readSession();
    const base = {
      session,
      orgProfile: { name: '', domain: '', email: '', timezone: 'Asia/Kolkata', plan: 'FREE' },
      codes: { manager: '', employee: '', expiry: 'Never', maxUses: 'Unlimited' },
      zones: [], routers: [], members: [], team: [],
      leaveRequests: [], tickets: [], activity: [],
      attendanceMe: [], attendanceToday: [],
      myDashboard: emptyDashboard
    };
    if (!session) return base;

    const leavePath = session.role === 'employee' ? '/leave-requests/me' : '/leave-requests';
    const isEmployee = session.role === 'employee';

    // All independent reads fire in parallel instead of one-at-a-time.
    const [
      orgProfile, codesRaw, zones, routers, members, team,
      ticketsRaw, activityRaw, leaveRaw, attendanceMe, attendanceToday, myDashboard
    ] = await Promise.all([
      safe(() => request('GET', '/organization'), base.orgProfile),
      safe(() => request('GET', '/join-codes'), []),
      safe(() => request('GET', '/zones'), []),
      safe(() => request('GET', '/routers'), []),
      safe(() => request('GET', '/members'), []),
      safe(() => request('GET', '/team'), []),
      safe(() => request('GET', '/tickets'), []),
      safe(() => request('GET', '/activity?limit=8'), []),
      safe(() => request('GET', leavePath), []),
      isEmployee ? safe(() => request('GET', '/attendance/me'), []) : Promise.resolve([]),
      isEmployee ? Promise.resolve([]) : safe(() => request('GET', '/attendance'), []),
      isEmployee ? safe(() => request('GET', '/attendance/me/dashboard'), emptyDashboard) : Promise.resolve(emptyDashboard)
    ]);

    base.orgProfile = orgProfile;
    base.codes = mapCodes(codesRaw);
    base.zones = zones;
    base.routers = routers;
    base.members = members;
    base.team = team;
    base.tickets = ticketsRaw.map(t => ({ ...t, time: timeAgo(t.time) }));
    base.activity = activityRaw.map(a => ({ ...a, time: timeAgo(a.time) }));
    base.leaveRequests = leaveRaw.map(r => ({ ...r, appliedOn: timeAgo(r.appliedOn) }));
    base.attendanceMe = attendanceMe;
    base.attendanceToday = attendanceToday;
    base.myDashboard = myDashboard;

    return base;
  }

  /** Returns a Promise resolving to the full aggregated data object. Always `await` this. */
  function get() {
    if (!cache) cache = fetchAll();
    return cache;
  }

  function invalidate() {
    cache = null;
  }

  /** Legacy generic mutator, kept for compatibility — mutates the in-memory cache only
   *  (used by call sites that haven't been migrated to a dedicated Store.* method yet). */
  async function update(mutatorFn) {
    const data = await get();
    mutatorFn(data);
    return data;
  }

  function logActivity() {
    // Activity is now written server-side whenever a mutation happens
    // (join, check-in, zone/router changes, leave/ticket decisions, etc).
    // Kept as a no-op so existing call sites don't need to be removed.
    invalidate();
  }

  // ---------- auth ----------

  async function loginWithPassword(email, password) {
    const res = await request('POST', '/auth/login', { email, password });
    return saveAuth(res);
  }

  async function signupOrganization(payload) {
    const res = await request('POST', '/auth/signup/organization', payload);
    return saveAuth(res);
  }

  async function joinWithCode(payload) {
    const res = await request('POST', '/auth/join', payload);
    return saveAuth(res);
  }

  function login(role, name) {
    // Legacy demo helper — no longer used now that login.js calls loginWithPassword().
    localStorage.setItem(SESSION_KEY, JSON.stringify({ role, name: name || 'ABC' }));
    cache = null;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    cache = null;
  }

  /** Synchronous by design — only reads localStorage, no network call, so pages can
   *  gate rendering on it immediately without an await. */
  function requireAuth(allowedRoles) {
    const session = readSession();
    if (!session || (allowedRoles && !allowedRoles.includes(session.role))) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  // ---------- organization ----------

  async function updateOrgProfile(partial) {
    const res = await request('PATCH', '/organization', partial);
    invalidate();
    return res;
  }

  // ---------- join codes ----------

  async function regenerateCode(codeId) {
    const res = await request('POST', `/join-codes/${codeId}/regenerate`);
    invalidate();
    return res;
  }

  async function updateCodeSettings(codeId, settings) {
    const res = await request('PATCH', `/join-codes/${codeId}`, settings);
    invalidate();
    return res;
  }

  // ---------- zones ----------

  async function addZone(zone) {
    const res = await request('POST', '/zones', zone);
    invalidate();
    return res;
  }

  async function updateZone(id, partial) {
    const res = await request('PATCH', `/zones/${id}`, partial);
    invalidate();
    return res;
  }

  async function deleteZone(id) {
    await request('DELETE', `/zones/${id}`);
    invalidate();
  }

  // ---------- routers ----------

  async function addRouter(router) {
    const res = await request('POST', '/routers', router);
    invalidate();
    return res;
  }

  async function updateRouter(id, partial) {
    const res = await request('PATCH', `/routers/${id}`, partial);
    invalidate();
    return res;
  }

  async function deleteRouter(id) {
    await request('DELETE', `/routers/${id}`);
    invalidate();
  }

  // ---------- members ----------

  async function addMember(member) {
    const res = await request('POST', '/members', member);
    invalidate();
    return res;
  }

  async function importMembers(csv) {
    const res = await request('POST', '/members/import', { csv });
    invalidate();
    return res;
  }

  // ---------- team ----------

  async function addTeamMember(member) {
    const res = await request('POST', '/team', member);
    invalidate();
    return res;
  }

  // ---------- leave requests ----------

  async function submitLeaveRequest(leave) {
    const res = await request('POST', '/leave-requests', leave);
    invalidate();
    return res;
  }

  async function updateLeaveStatus(id, status) {
    const res = await request('PATCH', `/leave-requests/${id}/status`, { status });
    invalidate();
    return res;
  }

  async function bulkUpdateLeaveStatus(ids, status) {
    const res = await request('PATCH', '/leave-requests/bulk-status', { ids, status });
    invalidate();
    return res;
  }

  // ---------- tickets ----------

  async function createTicket(ticket) {
    const res = await request('POST', '/tickets', ticket);
    invalidate();
    return res;
  }

  async function updateTicketStatus(id, status) {
    const res = await request('PATCH', `/tickets/${id}/status`, { status });
    invalidate();
    return res;
  }

  async function bulkUpdateTicketStatus(ids, status) {
    const res = await request('PATCH', '/tickets/bulk-status', { ids, status });
    invalidate();
    return res;
  }

  // ---------- shifts & timetable ----------

  async function listShifts() {
    return safe(() => request('GET', '/shifts'), []);
  }

  async function addShift(shift) {
    const res = await request('POST', '/shifts', shift);
    invalidate();
    return res;
  }

  async function updateShift(id, partial) {
    const res = await request('PATCH', `/shifts/${id}`, partial);
    invalidate();
    return res;
  }

  async function deleteShift(id) {
    await request('DELETE', `/shifts/${id}`);
    invalidate();
  }

  async function getTimetable() {
    return safe(() => request('GET', '/shifts/timetable'), []);
  }

  async function assignShift(userId, shiftId) {
    const res = await request('POST', `/members/${userId}/shift`, { shiftId });
    invalidate();
    return res;
  }

  // ---------- attendance reports & alerts ----------

  const emptyOverview = { totalMembers: 0, totalManagers: 0, presentToday: 0, lateToday: 0,
    absentToday: 0, onLeaveToday: 0, attendanceRateToday: 0, pendingLeaveRequests: 0,
    pendingTickets: 0, zonesCount: 0, routersCount: 0 };

  async function getOverview() {
    return safe(() => request('GET', '/analytics/overview'), emptyOverview);
  }

  async function getAttendanceReport(from, to) {
    return safe(() => request('GET', `/attendance/report?from=${from}&to=${to}`), []);
  }

  /** Triggers a browser download of the CSV — uses fetch directly (not the JSON `request`
   *  helper) since the response body is a binary blob, not JSON. */
  function exportAttendanceCsv(from, to) {
    const token = localStorage.getItem(TOKEN_KEY);
    const url = `${API_BASE}/attendance/export?from=${from}&to=${to}`;
    return fetch(url, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `attendance_${from}_to_${to}.csv`;
        link.click();
      })
      .catch(() => alert('Could not export attendance CSV. Is the backend running?'));
  }

  async function getAlerts() {
    return safe(() => request('GET', '/analytics/alerts'), []);
  }

  // ---------- attendance ----------

  async function checkIn(payload) {
    const res = await request('POST', '/attendance/check-in', payload || {});
    invalidate();
    return res;
  }

  async function checkOut() {
    const res = await request('POST', '/attendance/check-out');
    invalidate();
    return res;
  }

  return {
    get, update, invalidate, logActivity, login, logout, requireAuth,
    loginWithPassword, signupOrganization, joinWithCode,
    updateOrgProfile,
    regenerateCode, updateCodeSettings,
    addZone, updateZone, deleteZone,
    addRouter, updateRouter, deleteRouter,
    addMember, importMembers,
    addTeamMember,
    submitLeaveRequest, updateLeaveStatus, bulkUpdateLeaveStatus,
    createTicket, updateTicketStatus, bulkUpdateTicketStatus,
    listShifts, addShift, updateShift, deleteShift, getTimetable, assignShift,
    getOverview, getAttendanceReport, exportAttendanceCsv, getAlerts,
    checkIn, checkOut
  };
})();
