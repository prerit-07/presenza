/* ============================================================
   Real notifications — faithful port of the psBuildNotifications /
   psTimeAgo / psIsToday functions added to shell.js. Pulls recent
   activity from AppStore; org/employee see different slices.
   ============================================================ */

import type { IconName } from '../components/Icon';
import { AppStore } from './appStore';
import type { SiteRole } from '../types/entities';

export interface NotifItem {
  icon: IconName;
  text: string;
  time?: string;
}

export function psTimeAgo(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + ' hr ago';
  const days = Math.floor(hrs / 24);
  return days + (days === 1 ? ' day ago' : ' days ago');
}

export function psIsToday(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
}

export async function psBuildNotifications(role: SiteRole): Promise<NotifItem[]> {
  const items: NotifItem[] = [];

  if (role === 'organization') {
    const nameByUserId: Record<number, string> = {};
    try {
      const employees = (await AppStore.getAllEmployees()) || [];
      employees.forEach((e) => { nameByUserId[e.userId] = e.employeeName; });
    } catch { /* non-fatal — items just fall back to generic text */ }

    try {
      const deviceReqs = (await AppStore.getPendingDeviceChangeRequests()) || [];
      deviceReqs.forEach((r) => items.push({
        icon: 'ticket',
        text: 'Device change request needs review' + (nameByUserId[r.userId] ? ' — ' + nameByUserId[r.userId] : ''),
        time: r.requestedAt,
      }));
    } catch { /* non-fatal */ }

    try {
      const attReqs = (await AppStore.getPendingAttendanceRequests()) || [];
      attReqs.forEach((r) => items.push({
        icon: 'fileText',
        text: (r.requestType === 'WFH' ? 'WFH' : 'Leave') + ' request needs review' + (nameByUserId[r.userId] ? ' — ' + nameByUserId[r.userId] : ''),
        time: r.requestedAt || r.startDate,
      }));
    } catch { /* non-fatal */ }

    try {
      const attendance = (await AppStore.getAttendanceList()) || [];
      attendance
        .slice()
        .sort((a, b) => new Date(b.checkinTime || 0).getTime() - new Date(a.checkinTime || 0).getTime())
        .slice(0, 3)
        .forEach((a) => items.push({
          icon: 'checkSquare',
          text: (nameByUserId[a.userId] || 'An employee') + ' checked in',
          time: a.checkinTime,
        }));
    } catch { /* non-fatal */ }
  } else {
    try {
      const myReqs = (await AppStore.getMyAttendanceRequests()) || [];
      myReqs
        .filter((r) => (r.status || '').toUpperCase() !== 'PENDING')
        .forEach((r) => items.push({
          icon: 'fileText',
          text: (r.requestType === 'WFH' ? 'WFH' : 'Leave') + ' request ' + (r.status || '').toLowerCase(),
          time: r.reviewedAt || r.startDate,
        }));
    } catch { /* non-fatal */ }

    try {
      const myDeviceReqs = (await AppStore.getMyDeviceChangeRequests()) || [];
      myDeviceReqs.forEach((r) => items.push({
        icon: 'ticket',
        text: 'Device change request ' + (r.status || 'pending').toLowerCase(),
        time: r.reviewedAt || r.requestedAt,
      }));
    } catch { /* non-fatal */ }

    try {
      const myTickets = (await AppStore.getMyTickets()) || [];
      myTickets.slice(0, 3).forEach((t) => items.push({
        icon: 'ticket',
        text: 'Ticket "' + (t.subject || 'Support request') + '" — ' + (t.status || 'open').toLowerCase(),
        time: t.updatedAt || t.createdAt,
      }));
    } catch { /* non-fatal */ }

    try {
      const myAttendance = (await AppStore.getMyAttendance()) || [];
      const today = myAttendance.find((a) => psIsToday(a.checkinTime));
      if (today) items.push({
        icon: 'mapPin',
        text: 'You checked in today' + (today.wifiVerified === false ? ' — pending Wi-Fi verification' : ''),
        time: today.checkinTime,
      });
    } catch { /* non-fatal */ }
  }

  items.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
  return items.slice(0, 5);
}
