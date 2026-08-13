/* ============================================================
   APP DATA BRIDGE — client for the App team's Presenza backend
   (deployed on Azure). Faithful TypeScript port of the original
   gps_fr/js/app-data.js — same identity model, same fallback
   logic, same endpoints. See that file's header comment for the
   full rationale; preserved verbatim below.

   Two separate identities are used here:
   - The PERSONAL account (whoever actually logs into the site)
     is the PRIMARY identity for org-admin actions WHEN the person
     logged in is themselves an ORG_ADMIN.
   - The SHARED admin account (APP_CREDENTIALS) is used as a
     fallback for org-admin reads/writes whenever the logged-in
     person is NOT an ORG_ADMIN, or nobody is logged in yet.
   - Personal-only actions ("my X" views, and anything an employee
     creates themselves) always require a personal login.
   ============================================================ */

import type {
  Attendance, AttendanceRequest, CheckInResponse, CurrentUser, Department, DeviceChangeRequest,
  Device, Employee, Geofence, Organization, PresenceSettings, Shift, Team, Ticket, TicketComment,
  WifiNetwork,
} from '../types/entities';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const APP_API_BASE = 'https://presenza-backend-sumit-hugqdzfwfxeybngu.centralindia-01.azurewebsites.net';

// Shared ORG_ADMIN account — fallback only, used for admin reads/writes
// if nobody has logged into the website yet.
const APP_CREDENTIALS = { email: 'saipattnaik13@gmail.com', password: 'Sai12345@' };

let appToken: string | null = null;
let appTokenExpiresAt = 0;

// Personal login (set by appLoginAs when someone actually logs in with
// their own app account). Primary identity for org-admin actions too,
// so each admin only ever touches their own organization's data.
let appUserToken: string | null = null;
let appUserTokenExpiresAt = 0;
let appUserInfo: CurrentUser | null = null;

interface LoginApiResponse {
  token: string;
  expiresAt?: string;
}

async function appLoginWith(email: string, password: string): Promise<LoginApiResponse> {
  const res = await fetch(APP_API_BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new ApiError('App login failed (' + res.status + ')', res.status);
  return res.json();
}

async function appLogin(): Promise<string> {
  const data = await appLoginWith(APP_CREDENTIALS.email, APP_CREDENTIALS.password);
  appToken = data.token;
  appTokenExpiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;
  return appToken;
}

async function appEnsureToken(): Promise<string> {
  if (appToken && Date.now() < appTokenExpiresAt - 60000) return appToken;
  return appLogin();
}

export async function appLoginAs(email: string, password: string): Promise<CurrentUser> {
  const data = await appLoginWith(email, password);
  appUserToken = data.token;
  appUserTokenExpiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;

  const res = await fetch(APP_API_BASE + '/auth/me', {
    headers: { Authorization: 'Bearer ' + appUserToken },
  });
  if (!res.ok) throw new ApiError('Could not read app profile (' + res.status + ')', res.status);
  appUserInfo = await res.json();
  persistPersonalAuth();
  return appUserInfo as CurrentUser;
}

// Persist the personal (whoever-logged-in) token across page loads —
// without this every admin would fall back to the shared account on
// every navigation (a full reload resets in-memory state).
const APP_PERSONAL_AUTH_KEY = 'presenzaAppPersonalAuth';

function persistPersonalAuth() {
  try {
    localStorage.setItem(APP_PERSONAL_AUTH_KEY, JSON.stringify({
      token: appUserToken,
      expiresAt: appUserTokenExpiresAt,
      info: appUserInfo,
    }));
  } catch { /* storage unavailable — personal login just won't survive navigation */ }
}

function restorePersonalAuth() {
  try {
    const raw = localStorage.getItem(APP_PERSONAL_AUTH_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && saved.token && saved.expiresAt && Date.now() < saved.expiresAt - 60000) {
      appUserToken = saved.token;
      appUserTokenExpiresAt = saved.expiresAt;
      appUserInfo = saved.info || null;
    } else {
      localStorage.removeItem(APP_PERSONAL_AUTH_KEY);
    }
  } catch { /* ignore corrupt storage */ }
}

export function clearPersonalAuth() {
  appUserToken = null;
  appUserTokenExpiresAt = 0;
  appUserInfo = null;
  try { localStorage.removeItem(APP_PERSONAL_AUTH_KEY); } catch { /* ignore */ }
}

// Restore immediately on module load, before anything else runs.
restorePersonalAuth();

export function appHasPersonalLogin(): boolean {
  return !!(appUserToken && Date.now() < appUserTokenExpiresAt - 60000);
}

/** True only when the person currently logged in is themselves an
 *  ORG_ADMIN. Org-admin reads/writes should use THIS check (not
 *  appHasPersonalLogin() alone) before preferring the personal token —
 *  an EMPLOYEE's own token has no permission on admin-only endpoints. */
function appIsAdminLogin(): boolean {
  return appHasPersonalLogin() && !!appUserInfo && appUserInfo.role === 'ORG_ADMIN';
}

function parseErrorMessage(pathForFallback: string, status: number, parsed: any): string {
  if (parsed && typeof parsed === 'object' && parsed.message) return parsed.message;
  return pathForFallback + ' failed (' + status + ')';
}

async function readJsonSafely(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

// ---------- admin helpers (org-admin reads + writes) ----------
// Several endpoints (getShiftById, getPresenceSettings, getGeofences, ...)
// are NOT actually admin-only on the backend — any authenticated user,
// including a plain EMPLOYEE, can read them scoped to their OWN
// organization. So always try whoever is currently logged in first,
// with THEIR OWN token. Only on 403 (role genuinely not allowed) do we
// fall back to the shared demo account. A 401 is NOT treated as
// "fall back" — that means their session expired.
async function appRequest<T>(path: string): Promise<T> {
  if (appHasPersonalLogin()) {
    const res = await fetch(APP_API_BASE + path, {
      headers: { Authorization: 'Bearer ' + appUserToken },
    });
    if (res.status !== 403) {
      const parsed = await readJsonSafely(res);
      if (!res.ok) {
        throw new ApiError(
          res.status === 401 ? 'Your session expired. Please log in again.' : parseErrorMessage(path, res.status, parsed),
          res.status,
        );
      }
      return parsed;
    }
    // 403 — this specific login isn't allowed to read this endpoint. Fall through.
  }

  const token = await appEnsureToken();
  let res = await fetch(APP_API_BASE + path, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) {
    await appLogin();
    res = await fetch(APP_API_BASE + path, { headers: { Authorization: 'Bearer ' + appToken } });
  }
  const parsed = await readJsonSafely(res);
  if (!res.ok) throw new ApiError(parseErrorMessage(path, res.status, parsed), res.status);
  return parsed;
}

async function appWriteWithSharedToken<T>(method: string, path: string, body?: unknown): Promise<T> {
  const doFetch = (tok: string) => fetch(APP_API_BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (appIsAdminLogin()) {
    const res = await doFetch(appUserToken as string);
    const parsed = await readJsonSafely(res);
    if (!res.ok) {
      throw new ApiError(
        res.status === 401 ? 'Your session expired. Please log in again.' : parseErrorMessage(path, res.status, parsed),
        res.status,
      );
    }
    return parsed;
  }

  const token = await appEnsureToken();
  let res = await doFetch(token);
  if (res.status === 401) {
    await appLogin();
    res = await doFetch(appToken as string);
  }
  const parsed = await readJsonSafely(res);
  if (!res.ok) throw new ApiError(parseErrorMessage(path, res.status, parsed), res.status);
  return parsed;
}

const appPost = <T,>(path: string, body?: unknown) => appWriteWithSharedToken<T>('POST', path, body);
const appPut = <T,>(path: string, body?: unknown) => appWriteWithSharedToken<T>('PUT', path, body);
const appPatch = <T,>(path: string, body?: unknown) => appWriteWithSharedToken<T>('PATCH', path, body);
const appDelete = <T,>(path: string) => appWriteWithSharedToken<T>('DELETE', path);

// ---------- personal-token helpers (an employee's own reads + writes) ----------

async function appUserRequest<T>(path: string): Promise<T> {
  if (!appHasPersonalLogin()) return appRequest<T>(path);
  const res = await fetch(APP_API_BASE + path, { headers: { Authorization: 'Bearer ' + appUserToken } });
  const parsed = await readJsonSafely(res);
  if (!res.ok) throw new ApiError(parseErrorMessage(path, res.status, parsed), res.status);
  return parsed;
}

/** Write helper for things an employee does themselves (leave/WFH
 *  requests, device change requests, tickets, check-ins, their own
 *  devices). Always uses the PERSONAL login. */
async function appUserWrite<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!appHasPersonalLogin()) {
    throw new ApiError('You need to be logged in with your own app account to do this.');
  }
  const res = await fetch(APP_API_BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + appUserToken },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const parsed = await readJsonSafely(res);
  if (!res.ok) throw new ApiError(parseErrorMessage(path, res.status, parsed), res.status);
  return parsed;
}

const appUserPost = <T,>(path: string, body?: unknown) => appUserWrite<T>('POST', path, body);
const appUserPatch = <T,>(path: string, body?: unknown) => appUserWrite<T>('PATCH', path, body);

/** Helper for endpoints that need NO auth at all — forgot-password flow. */
async function appPublicRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(APP_API_BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const parsed = await readJsonSafely(res);
  if (!res.ok) throw new ApiError(parseErrorMessage(path, res.status, parsed), res.status);
  return parsed;
}

export const AppStore = {
  // ---------- reads ----------
  getMe: () => appUserRequest<CurrentUser>('/auth/me'),
  getMyEmployee: () => appUserRequest<Employee>('/api/employees/me'),
  getOrganization: () => appRequest<Organization>('/api/organizations/me'),
  getPresenceSettings: () => appRequest<PresenceSettings>('/api/organizations/me/presence-settings'),
  getShifts: () => appRequest<Shift[]>('/api/shifts'),
  getShiftById: (id: number) => appRequest<Shift>('/api/shifts/' + id),
  getGeofences: () => appRequest<Geofence[]>('/api/geofences'),
  getGeofenceById: (id: number) => appRequest<Geofence>('/api/geofences/' + id),
  getWifiNetworksForGeofence: (geofenceId: number) => appRequest<WifiNetwork[]>('/api/wifi-networks/geofence/' + geofenceId),
  getDepartments: () => appRequest<Department[]>('/api/departments'),
  getTeams: () => appRequest<Team[]>('/api/teams'),
  getMyTeammates: () => appUserRequest<Employee[]>('/api/teams/me/teammates'),
  getMyTeamMembers: () => appUserRequest<Employee[]>('/api/teams/me/members'),
  getMyTickets: () => appUserRequest<Ticket[]>('/tickets/me'),
  getOrganizationTickets: () => appRequest<Ticket[]>('/tickets'),
  getTicketById: (ticketId: number) => appRequest<Ticket>('/tickets/' + ticketId),
  getTicketComments: (ticketId: number) => appRequest<TicketComment[]>('/tickets/' + ticketId + '/comments'),
  getMyPresenceHistory: () => appUserRequest<unknown[]>('/presence/history/me'),
  getMyAttendance: () => appUserRequest<Attendance[]>('/attendance/me'),
  getMyAttendanceRequests: () => appUserRequest<AttendanceRequest[]>('/attendance-requests/me'),
  getMyDeviceChangeRequests: () => appUserRequest<DeviceChangeRequest[]>('/device-change-requests/me'),
  getAllEmployees: () => appRequest<Employee[]>('/api/employees'),
  getEmployeeById: (id: number) => appRequest<Employee>('/api/employees/' + id),
  getPendingAttendanceRequests: () => appRequest<AttendanceRequest[]>('/attendance-requests/pending'),
  getPendingDeviceChangeRequests: () => appRequest<DeviceChangeRequest[]>('/device-change-requests/pending'),
  getAttendanceList: () => appRequest<Attendance[]>('/attendance'),
  getPendingAttendance: () => appRequest<Attendance[]>('/attendance/pending'),
  getMyDevices: () => appUserRequest<Device[]>('/devices'),

  // ---------- attendance / device-change request reviews ----------
  reviewAttendanceRequest: (requestId: number, approved: boolean, remarks?: string) =>
    appPatch('/attendance-requests/' + requestId + '/review', { approved, remarks }),
  reviewDeviceChangeRequest: (requestId: number, approved: boolean) =>
    appPatch('/device-change-requests/' + requestId + '/review', { approved }),
  reviewAttendance: (attendanceId: number, approved: boolean, remarks?: string) =>
    appPatch('/attendance/' + attendanceId + '/review', { approved, remarks }),

  // ---------- employee create-actions (personal login required) ----------
  createAttendanceRequest: (requestType: string, startDate: string, endDate: string, reason: string) =>
    appUserPost('/attendance-requests', { requestType, startDate, endDate, reason }),
  createDeviceChangeRequest: (oldDeviceId: string, newDeviceId: string, reason: string) =>
    appUserPost('/device-change-requests', { oldDeviceId, newDeviceId, reason }),
  createTicket: (subject: string, description: string) =>
    appUserPost<Ticket>('/tickets', { subject, description }),
  employeeCheckIn: (
    shiftId: number, deviceId: string, latitude: number, longitude: number, accuracy: number,
    connectedSsid: string | null = null, connectedBssid: string | null = null,
  ) => appUserPost<CheckInResponse>('/check-ins/employee', {
    shiftId, deviceId, latitude, longitude, accuracy, connectedSsid, connectedBssid,
  }),
  registerMyDevice: (deviceId: string, platform: string, model: string, appVersion: string | null) =>
    appUserPost('/devices', { deviceId, platform, model, appVersion }),
  deactivateMyDevice: (deviceId: string) => appUserPatch('/devices/' + deviceId + '/deactivate', {}),

  // ---------- org-admin write actions: employees ----------
  createEmployee: (
    username: string, email: string, employeeName: string, dateOfJoining: string | null,
    departmentId: number | null, shiftId: number | null, teamId: number | null,
  ) => appPost<Employee>('/api/employees', { username, email, employeeName, dateOfJoining, departmentId, shiftId, teamId }),
  updateEmployee: (id: number, payload: Partial<Employee> & { orgId: number; userId: number }) =>
    appPut<Employee>('/api/employees/' + id, payload),

  // ---------- org-admin write actions: shifts ----------
  // orgId is required by backend validation even though the service
  // derives the real org from the caller's token — pass getOrganization().orgId.
  createShift: (orgId: number, shiftName: string, startTime: string, endTime: string, allowedLateMinutes: number | null, geofenceId: number | null) =>
    appPost<Shift>('/api/shifts', { orgId, shiftName, startTime, endTime, allowedLateMinutes, geofenceId }),
  updateShift: (id: number, orgId: number, shiftName: string, startTime: string, endTime: string, allowedLateMinutes: number | null, geofenceId: number | null) =>
    appPut<Shift>('/api/shifts/' + id, { orgId, shiftName, startTime, endTime, allowedLateMinutes, geofenceId }),

  // ---------- org-admin write actions: geofences ----------
  createGeofence: (orgId: number, latitude: number, longitude: number, radius: number, buildingName: string | null, routers?: unknown[]) =>
    appPost<Geofence>('/api/geofences', { orgId, latitude, longitude, radius, buildingName, routers: routers || [] }),
  updateGeofence: (id: number, orgId: number, latitude: number, longitude: number, radius: number, buildingName: string | null) =>
    // Backend ignores `routers` on update — editing a geofence never touches its WiFi networks.
    appPut<Geofence>('/api/geofences/' + id, { orgId, latitude, longitude, radius, buildingName }),
  deleteGeofence: (id: number) => appDelete('/api/geofences/' + id),

  // ---------- org-admin write actions: wifi networks ----------
  createWifiNetwork: (geofenceId: number, ssid: string, bssid: string) =>
    appPost<WifiNetwork>('/api/wifi-networks', { geofenceId, ssid, bssid }),
  updateWifiNetwork: (id: number, geofenceId: number, ssid: string, bssid: string) =>
    appPut<WifiNetwork>('/api/wifi-networks/' + id, { geofenceId, ssid, bssid }),

  // ---------- org-admin write actions: departments ----------
  createDepartment: (orgId: number, departmentName: string) =>
    appPost<Department>('/api/departments', { orgId, departmentName }),
  updateDepartment: (id: number, orgId: number, departmentName: string) =>
    appPut<Department>('/api/departments/' + id, { orgId, departmentName }),

  // ---------- org-admin write actions: teams ----------
  createTeam: (orgId: number, teamName: string, managerEmployeeId: number | null) =>
    appPost<Team>('/api/teams', { orgId, teamName, managerEmployeeId }),
  updateTeam: (id: number, orgId: number, teamName: string, managerEmployeeId: number | null) =>
    appPut<Team>('/api/teams/' + id, { orgId, teamName, managerEmployeeId }),

  // ---------- org-admin write actions: organization + presence settings ----------
  updateOrganization: (orgName: string, orgType: string) =>
    appPut<Organization>('/api/organizations/me', { orgName, orgType }),
  updatePresenceSettings: (presenceMonitoringEnabled: boolean, presenceUpdateIntervalSeconds: number, requireTrustedWifi: boolean) =>
    appPut<PresenceSettings>('/api/organizations/me/presence-settings', { presenceMonitoringEnabled, presenceUpdateIntervalSeconds, requireTrustedWifi }),

  // ---------- org-admin write actions: tickets ----------
  assignTicket: (ticketId: number, employeeId: number) => appPatch<Ticket>('/tickets/' + ticketId + '/assign', { employeeId }),
  updateTicketStatus: (ticketId: number, status: string) => appPatch<Ticket>('/tickets/' + ticketId + '/status', { status }),
  /** Either an admin or the ticket's own employee can comment — prefers
   *  the personal login so comments are attributed correctly. */
  addTicketComment: (ticketId: number, message: string) => {
    if (appHasPersonalLogin()) return appUserPost<TicketComment>('/tickets/' + ticketId + '/comments', { message });
    return appPost<TicketComment>('/tickets/' + ticketId + '/comments', { message });
  },

  // ---------- org-admin write actions: attendance ----------
  createManualAttendance: (employeeId: number, attendanceDate: string, status: string, effectiveCheckinTime: string | null, remarks: string | null) =>
    appPost<Attendance>('/attendance/manual', { employeeId, attendanceDate, status, effectiveCheckinTime, remarks }),
  correctAttendance: (attendanceId: number, status: string, effectiveCheckinTime: string | null, remarks: string | null) =>
    appPatch<Attendance>('/attendance/' + attendanceId, { status, effectiveCheckinTime, remarks }),

  // ---------- forgot-password flow (no auth required) ----------
  forgotPassword: (email: string) => appPublicRequest('/auth/forgot-password', 'POST', { email }),
  verifyPasswordResetOtp: (email: string, otp: string) =>
    appPublicRequest('/verification/verify-otp', 'POST', { email, otp, purpose: 'PASSWORD_RESET' }),
  resetPassword: (email: string, newPassword: string) =>
    appPublicRequest('/auth/reset-password', 'PUT', { email, newPassword }),
};

export { appEnsureToken };
