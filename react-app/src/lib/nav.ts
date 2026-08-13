/* ============================================================
   PS_NAV — port of shell.js's nav config. hrefs are now route
   paths (matched by <NavLink> automatically) instead of .html
   files. The MANAGER role entry was already removed from the
   original before this port (the app dropped that role).
   ============================================================ */

import type { IconName } from '../components/Icon';
import type { SiteRole } from '../types/entities';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: IconName;
}

export const PS_NAV: Record<SiteRole, NavItem[]> = {
  // The app's admin role now does everything a manager used to (there is no
  // MANAGER role on their side anymore) — Attendance, Attendance Requests,
  // Device Requests and Support Tickets moved here from the old manager nav.
  organization: [
    { key: 'overview', label: 'Overview', href: '/organization', icon: 'home' },
    { key: 'analytics', label: 'Analytics', href: '/analytics', icon: 'barChart' },
    { key: 'setup', label: 'Organisation Setup', href: '/profile', icon: 'settings' },
    { key: 'shifts', label: 'Shifts & Timetable', href: '/shifts', icon: 'calendar' },
    { key: 'geofencing', label: 'Geofencing', href: '/geofencing', icon: 'mapPin' },
    { key: 'wifi', label: 'Wifi / BSSID', href: '/wifi', icon: 'wifi' },
    { key: 'members', label: 'Members', href: '/members', icon: 'users' },
    { key: 'team', label: 'Team Management', href: '/team', icon: 'usersGroup' },
    { key: 'attendance', label: 'Attendance', href: '/attendance', icon: 'checkSquare' },
    { key: 'leave', label: 'Attendance Requests', href: '/manager-leave', icon: 'fileText' },
    { key: 'tickets', label: 'Device Requests', href: '/tickets', icon: 'ticket' },
    { key: 'support-tickets', label: 'Support Tickets', href: '/app-tickets', icon: 'ticket' },
  ],
  employee: [
    { key: 'home', label: 'Home', href: '/employee', icon: 'home' },
  ],
};
