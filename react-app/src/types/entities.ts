/* ============================================================
   Shared entity types — mirror the real backend response shapes
   (confirmed against both gps_fr/js/app-data.js call sites and
   Presenza-dev/services/*.ts interfaces).
   ============================================================ */

export type Role = 'ORG_ADMIN' | 'EMPLOYEE' | string;
export type SiteRole = 'organization' | 'employee';

export interface CurrentUser {
  userId: number;
  username: string;
  email: string;
  role: Role;
}

export interface Session {
  role: SiteRole;
  name: string;
  userId: number;
  email: string;
}

export interface Employee {
  employeeId: number;
  orgId: number;
  userId: number;
  employeeName: string;
  name?: string;
  dateOfJoining: string | null;
  departmentId: number | null;
  shiftId: number | null;
  teamId: number | null;
}

export interface Organization {
  orgId: number;
  orgName: string;
  orgType: string;
  planId: number;
  companyCode?: string;
  planName: string;
  maxAllowedEmployee: number;
  createdAt: string;
}

export interface PresenceSettings {
  presenceMonitoringEnabled: boolean;
  presenceUpdateIntervalSeconds: number;
  requireTrustedWifi: boolean;
}

export interface Shift {
  shiftId: number;
  orgId: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  allowedLateMinutes: number | null;
  geofenceId: number | null;
}

export interface Geofence {
  geofenceId: number;
  orgId: number;
  latitude: number;
  longitude: number;
  radius: number;
  buildingName: string | null;
}

export interface WifiNetwork {
  wifiId: number;
  geofenceId: number;
  ssid: string;
  bssid: string;
  addedAt?: string | null;
  active?: boolean;
  buildingName?: string;
}

export interface Department {
  departmentId: number;
  orgId: number;
  departmentName: string;
}

export interface Team {
  teamId: number;
  orgId: number;
  teamName: string;
  managerEmployeeId: number | null;
}

export type TicketStatus = 'PENDING' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED' | string;

export interface Ticket {
  ticketId: number;
  subject: string;
  title?: string;
  description: string;
  status: TicketStatus;
  checkinId?: number | null;
  attendanceId?: number | null;
  assignedEmployeeId?: number | null;
  assignedToEmployeeId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketComment {
  commentId: number;
  ticketId: number;
  message: string;
  authorName?: string;
  createdAt: string;
}

export type AttendanceStatus = 'PRESENT' | 'PENDING' | 'REJECTED' | 'ABSENT' | 'LATE' | string;

export interface Attendance {
  attendanceId: number;
  checkinId: number;
  userId: number;
  shiftId: number | null;
  status: AttendanceStatus;
  approvedAt: string | null;
  remarks: string | null;
  checkinTime: string;
  effectiveCheckinTime?: string | null;
  wifiVerified: boolean;
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string;

export interface AttendanceRequest {
  requestId: number;
  userId: number;
  requestType: 'LEAVE' | 'WFH' | string;
  startDate: string;
  endDate: string;
  reason: string;
  status: RequestStatus;
  requestedAt: string;
  reviewedAt?: string | null;
  employeeName?: string;
  employeeId?: number;
  createdAt?: string;
}

export interface DeviceChangeRequest {
  requestId: number;
  userId: number;
  oldDeviceId: string;
  newDeviceId: string;
  reason: string;
  status: RequestStatus;
  reviewedByEmployeeId: number | null;
  requestedAt: string;
  reviewedAt: string | null;
}

export interface Device {
  deviceId: string;
  platform: string;
  model: string;
  appVersion: string;
  boundAt: string;
  lastSeenAt: string | null;
  active: boolean;
}

export interface CheckInResponse {
  checkInId: number;
  employeeId: number;
  shiftId: number;
  deviceId: string;
  checkInTime: string;
  latitude: number | null;
  longitude: number | null;
  wifiVerified: boolean;
  attendanceStatus?: string | null;
}

export interface ApiErrorShape {
  status?: number;
  message: string;
}
