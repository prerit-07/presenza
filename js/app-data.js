/* ============================================================
   APP DATA BRIDGE — client for the other team's Presenza app
   backend (deployed on Azure).

   Two separate identities are used here:
   - The SHARED admin account (APP_CREDENTIALS) unlocks org-wide
     data (all employees, teams, pending queues, org profile) and
     is used for every org-admin write action (create/update/delete
     employees, shifts, geofences, wifi, departments, teams, org
     settings, ticket assignment/status, manual attendance/review).
   - The PERSONAL account (whoever actually logs into the website)
     is used for "my X" personal views AND for anything an
     employee creates themselves (leave/WFH requests, device change
     requests, tickets, check-ins, their own devices) — those need
     to be attributed to the real person, not the shared admin, so
     they always require appHasPersonalLogin() and throw a clear
     error if nobody's logged in via the app yet.
   ============================================================ */

const APP_API_BASE = 'https://presenza-backend-sumit-hugqdzfwfxeybngu.centralindia-01.azurewebsites.net';

// Shared ORG_ADMIN account — unlocks org-wide data and is required
// for every admin write action.
const APP_CREDENTIALS = { email: 'saipattnaik13@gmail.com', password: 'Sai12345@' };

let appToken = null;
let appTokenExpiresAt = 0;

// Personal login (set by appLoginAs when someone actually logs into
// the website with their own app account).
let appUserToken = null;
let appUserTokenExpiresAt = 0;
let appUserInfo = null; // { userId, username, email, role } from /auth/me

async function appLoginWith(email, password) {
  const res = await fetch(APP_API_BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password }),
  });
  if (!res.ok) throw new Error('App login failed (' + res.status + ')');
  return res.json();
}

async function appLogin() {
  const data = await appLoginWith(APP_CREDENTIALS.email, APP_CREDENTIALS.password);
  appToken = data.token;
  appTokenExpiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;
  return appToken;
}

async function appEnsureToken() {
  if (appToken && Date.now() < appTokenExpiresAt - 60000) return appToken;
  return appLogin();
}

async function appLoginAs(email, password) {
  const data = await appLoginWith(email, password);
  appUserToken = data.token;
  appUserTokenExpiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;

  const res = await fetch(APP_API_BASE + '/auth/me', {
    headers: { Authorization: 'Bearer ' + appUserToken },
  });
  if (!res.ok) throw new Error('Could not read app profile (' + res.status + ')');
  appUserInfo = await res.json();
  return appUserInfo;
}

function appHasPersonalLogin() {
  return !!(appUserToken && Date.now() < appUserTokenExpiresAt - 60000);
}

function parseErrorMessage(pathForFallback, status, parsed) {
  if (parsed && typeof parsed === 'object' && parsed.message) return parsed.message;
  return pathForFallback + ' failed (' + status + ')';
}

async function readJsonSafely(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) { return text; }
}

// ---------- shared-admin-token helpers (org-admin reads + writes) ----------

async function appRequest(path) {
  const token = await appEnsureToken();
  let res = await fetch(APP_API_BASE + path, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (res.status === 401) {
    await appLogin();
    res = await fetch(APP_API_BASE + path, {
      headers: { Authorization: 'Bearer ' + appToken },
    });
  }
  const parsed = await readJsonSafely(res);
  if (!res.ok) {
    const err = new Error(parseErrorMessage(path, res.status, parsed));
    err.status = res.status;
    throw err;
  }
  return parsed;
}

async function appWriteWithSharedToken(method, path, body) {
  const token = await appEnsureToken();
  const doFetch = function (tok) {
    return fetch(APP_API_BASE + path, {
      method: method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };
  let res = await doFetch(token);
  if (res.status === 401) {
    await appLogin();
    res = await doFetch(appToken);
  }
  const parsed = await readJsonSafely(res);
  if (!res.ok) {
    const err = new Error(parseErrorMessage(path, res.status, parsed));
    err.status = res.status;
    throw err;
  }
  return parsed;
}

function appPost(path, body) { return appWriteWithSharedToken('POST', path, body); }
function appPut(path, body) { return appWriteWithSharedToken('PUT', path, body); }
function appPatch(path, body) { return appWriteWithSharedToken('PATCH', path, body); }
function appDelete(path) { return appWriteWithSharedToken('DELETE', path, undefined); }

// ---------- personal-token helpers (an employee's own reads + writes) ----------

async function appUserRequest(path) {
  if (!appHasPersonalLogin()) return appRequest(path);
  const res = await fetch(APP_API_BASE + path, {
    headers: { Authorization: 'Bearer ' + appUserToken },
  });
  const parsed = await readJsonSafely(res);
  if (!res.ok) {
    const err = new Error(parseErrorMessage(path, res.status, parsed));
    err.status = res.status;
    throw err;
  }
  return parsed;
}

/** Write helper for things an employee does themselves (leave/WFH
 *  requests, device change requests, tickets, check-ins, their own
 *  devices). Always uses the PERSONAL login — these need to be
 *  attributed to the real person, so this throws a clear error
 *  rather than silently falling back to the shared admin account. */
async function appUserWrite(method, path, body) {
  if (!appHasPersonalLogin()) {
    throw new Error('You need to be logged in with your own app account to do this.');
  }
  const res = await fetch(APP_API_BASE + path, {
    method: method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + appUserToken },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const parsed = await readJsonSafely(res);
  if (!res.ok) {
    const err = new Error(parseErrorMessage(path, res.status, parsed));
    err.status = res.status;
    throw err;
  }
  return parsed;
}

function appUserPost(path, body) { return appUserWrite('POST', path, body); }
function appUserPatch(path, body) { return appUserWrite('PATCH', path, body); }

/** Helper for endpoints that need NO auth at all — used by the
 *  forgot-password flow (forgot-password / verify-otp / reset-password),
 *  which by definition run before anyone is logged in. */
async function appPublicRequest(path, method, body) {
  const res = await fetch(APP_API_BASE + path, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const parsed = await readJsonSafely(res);
  if (!res.ok) {
    const err = new Error(parseErrorMessage(path, res.status, parsed));
    err.status = res.status;
    throw err;
  }
  return parsed;
}

const AppStore = {
  // ---------- reads ----------
  getMe: function () { return appUserRequest('/auth/me'); },
  getMyEmployee: function () { return appUserRequest('/api/employees/me'); },
  getOrganization: function () { return appRequest('/api/organizations/me'); },
  getPresenceSettings: function () { return appRequest('/api/organizations/me/presence-settings'); },
  getShifts: function () { return appRequest('/api/shifts'); },
  getShiftById: function (id) { return appRequest('/api/shifts/' + id); },
  getGeofences: function () { return appRequest('/api/geofences'); },
  getGeofenceById: function (id) { return appRequest('/api/geofences/' + id); },
  getWifiNetworksForGeofence: function (geofenceId) { return appRequest('/api/wifi-networks/geofence/' + geofenceId); },
  getDepartments: function () { return appRequest('/api/departments'); },
  getTeams: function () { return appRequest('/api/teams'); },
  getMyTeammates: function () { return appUserRequest('/api/teams/me/teammates'); },
  getMyTeamMembers: function () { return appUserRequest('/api/teams/me/members'); },
  getMyTickets: function () { return appUserRequest('/tickets/me'); },
  getOrganizationTickets: function () { return appRequest('/tickets'); },
  getTicketById: function (ticketId) { return appRequest('/tickets/' + ticketId); },
  getTicketComments: function (ticketId) { return appRequest('/tickets/' + ticketId + '/comments'); },
  getMyPresenceHistory: function () { return appUserRequest('/presence/history/me'); },
  getMyAttendance: function () { return appUserRequest('/attendance/me'); },
  getMyAttendanceRequests: function () { return appUserRequest('/attendance-requests/me'); },
  getMyDeviceChangeRequests: function () { return appUserRequest('/device-change-requests/me'); },
  getAllEmployees: function () { return appRequest('/api/employees'); },
  getEmployeeById: function (id) { return appRequest('/api/employees/' + id); },
  getPendingAttendanceRequests: function () { return appRequest('/attendance-requests/pending'); },
  getPendingDeviceChangeRequests: function () { return appRequest('/device-change-requests/pending'); },
  getAttendanceList: function () { return appRequest('/attendance'); },
  getPendingAttendance: function () { return appRequest('/attendance/pending'); },
  getMyDevices: function () { return appUserRequest('/devices'); },

  // ---------- attendance / device-change request reviews ----------
  reviewAttendanceRequest: function (requestId, approved, remarks) {
    return appPatch('/attendance-requests/' + requestId + '/review', { approved: approved, remarks: remarks });
  },
  reviewDeviceChangeRequest: function (requestId, approved) {
    return appPatch('/device-change-requests/' + requestId + '/review', { approved: approved });
  },
  reviewAttendance: function (attendanceId, approved, remarks) {
    return appPatch('/attendance/' + attendanceId + '/review', { approved: approved, remarks: remarks });
  },

  // ---------- employee create-actions (personal login required) ----------
  createAttendanceRequest: function (requestType, startDate, endDate, reason) {
    return appUserPost('/attendance-requests', { requestType: requestType, startDate: startDate, endDate: endDate, reason: reason });
  },
  createDeviceChangeRequest: function (oldDeviceId, newDeviceId, reason) {
    return appUserPost('/device-change-requests', { oldDeviceId: oldDeviceId, newDeviceId: newDeviceId, reason: reason });
  },
  createTicket: function (subject, description) {
    return appUserPost('/tickets', { subject: subject, description: description });
  },
  employeeCheckIn: function (shiftId, deviceId, latitude, longitude, accuracy) {
    return appUserPost('/check-ins/employee', {
      shiftId: shiftId,
      deviceId: deviceId,
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy,
    });
  },
  registerMyDevice: function (deviceId, platform, model, appVersion) {
    return appUserPost('/devices', { deviceId: deviceId, platform: platform, model: model, appVersion: appVersion });
  },
  deactivateMyDevice: function (deviceId) {
    return appUserPatch('/devices/' + deviceId + '/deactivate', {});
  },

  // ---------- org-admin write actions: employees ----------
  createEmployee: function (username, email, employeeName, dateOfJoining, departmentId, shiftId, teamId) {
    return appPost('/api/employees', {
      username: username, email: email, employeeName: employeeName, dateOfJoining: dateOfJoining,
      departmentId: departmentId, shiftId: shiftId, teamId: teamId,
    });
  },
  updateEmployee: function (id, payload) {
    // payload: { orgId, userId, employeeName, dateOfJoining, departmentId, shiftId, teamId }
    return appPut('/api/employees/' + id, payload);
  },

  // ---------- org-admin write actions: shifts ----------
  createShift: function (shiftName, startTime, endTime, allowedLateMinutes, geofenceId) {
    return appPost('/api/shifts', { shiftName: shiftName, startTime: startTime, endTime: endTime, allowedLateMinutes: allowedLateMinutes, geofenceId: geofenceId });
  },
  updateShift: function (id, shiftName, startTime, endTime, allowedLateMinutes, geofenceId) {
    return appPut('/api/shifts/' + id, { shiftName: shiftName, startTime: startTime, endTime: endTime, allowedLateMinutes: allowedLateMinutes, geofenceId: geofenceId });
  },

  // ---------- org-admin write actions: geofences ----------
  // orgId is required by their backend (validated against the caller's
  // own org) — pass the value from AppStore.getOrganization().orgId.
  createGeofence: function (orgId, latitude, longitude, radius, buildingName, routers) {
    return appPost('/api/geofences', { orgId: orgId, latitude: latitude, longitude: longitude, radius: radius, buildingName: buildingName, routers: routers || [] });
  },
  updateGeofence: function (id, orgId, latitude, longitude, radius, buildingName) {
    // Their backend ignores `routers` on update, so it's intentionally
    // left out here — editing a geofence never touches its WiFi networks.
    return appPut('/api/geofences/' + id, { orgId: orgId, latitude: latitude, longitude: longitude, radius: radius, buildingName: buildingName });
  },
  deleteGeofence: function (id) {
    return appDelete('/api/geofences/' + id);
  },

  // ---------- org-admin write actions: wifi networks ----------
  createWifiNetwork: function (geofenceId, ssid, bssid) {
    return appPost('/api/wifi-networks', { geofenceId: geofenceId, ssid: ssid, bssid: bssid });
  },
  updateWifiNetwork: function (id, geofenceId, ssid, bssid) {
    return appPut('/api/wifi-networks/' + id, { geofenceId: geofenceId, ssid: ssid, bssid: bssid });
  },

  // ---------- org-admin write actions: departments ----------
  createDepartment: function (departmentName) {
    return appPost('/api/departments', { departmentName: departmentName });
  },
  updateDepartment: function (id, departmentName) {
    return appPut('/api/departments/' + id, { departmentName: departmentName });
  },

  // ---------- org-admin write actions: teams ----------
  createTeam: function (teamName, managerEmployeeId) {
    return appPost('/api/teams', { teamName: teamName, managerEmployeeId: managerEmployeeId });
  },
  updateTeam: function (id, teamName, managerEmployeeId) {
    return appPut('/api/teams/' + id, { teamName: teamName, managerEmployeeId: managerEmployeeId });
  },

  // ---------- org-admin write actions: organization + presence settings ----------
  updateOrganization: function (orgName, orgType) {
    return appPut('/api/organizations/me', { orgName: orgName, orgType: orgType });
  },
  updatePresenceSettings: function (presenceMonitoringEnabled, presenceUpdateIntervalSeconds, requireTrustedWifi) {
    return appPut('/api/organizations/me/presence-settings', {
      presenceMonitoringEnabled: presenceMonitoringEnabled,
      presenceUpdateIntervalSeconds: presenceUpdateIntervalSeconds,
      requireTrustedWifi: requireTrustedWifi,
    });
  },

  // ---------- org-admin write actions: tickets ----------
  assignTicket: function (ticketId, employeeId) {
    return appPatch('/tickets/' + ticketId + '/assign', { employeeId: employeeId });
  },
  updateTicketStatus: function (ticketId, status) {
    return appPatch('/tickets/' + ticketId + '/status', { status: status });
  },
  /** Either an admin or the ticket's own employee can comment — uses
   *  whichever login is available, preferring the personal one so
   *  comments are attributed correctly when an employee is logged in. */
  addTicketComment: function (ticketId, message) {
    if (appHasPersonalLogin()) return appUserPost('/tickets/' + ticketId + '/comments', { message: message });
    return appPost('/tickets/' + ticketId + '/comments', { message: message });
  },

  // ---------- org-admin write actions: attendance ----------
  createManualAttendance: function (employeeId, attendanceDate, status, effectiveCheckinTime, remarks) {
    return appPost('/attendance/manual', {
      employeeId: employeeId, attendanceDate: attendanceDate, status: status,
      effectiveCheckinTime: effectiveCheckinTime, remarks: remarks,
    });
  },
  correctAttendance: function (attendanceId, status, effectiveCheckinTime, remarks) {
    return appPatch('/attendance/' + attendanceId, { status: status, effectiveCheckinTime: effectiveCheckinTime, remarks: remarks });
  },

  // ---------- forgot-password flow (no auth required) ----------
  forgotPassword: function (email) {
    return appPublicRequest('/auth/forgot-password', 'POST', { email: email });
  },
  verifyPasswordResetOtp: function (email, otp) {
    return appPublicRequest('/verification/verify-otp', 'POST', { email: email, otp: otp, purpose: 'PASSWORD_RESET' });
  },
  resetPassword: function (email, newPassword) {
    return appPublicRequest('/auth/reset-password', 'PUT', { email: email, newPassword: newPassword });
  },
};

window.AppStore = AppStore;
window.appLoginAs = appLoginAs;
window.appHasPersonalLogin = appHasPersonalLogin;
window.APP_CREDENTIALS = APP_CREDENTIALS;

async function appRenderSection(bodyElId, loader, render) {
  const el = document.getElementById(bodyElId);
  if (!el) return;
  try {
    const data = await loader();
    el.innerHTML = render(data);
  } catch (err) {
    if (err.status === 403) {
      el.innerHTML = '<div class="ps-empty">Needs a manager/org-admin account on their side to view this.</div>';
    } else if (err.status === 404) {
      el.innerHTML = '<div class="ps-empty">Not found / no data yet.</div>';
    } else {
      el.innerHTML = '<div class="ps-empty">Couldn\'t load this (' + escapeAppHtml(err.message) + ').</div>';
    }
  }
}

function escapeAppHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}
