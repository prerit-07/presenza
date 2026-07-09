/* ============================================================
   PRESENZA — shared inline icon set (no external icon library needed)
   ============================================================ */

const PSIcons = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64 1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.6 12.4 19 4l3 3-2 2 1.5 1.5-2 2L18 11l-2 2"/>',
  mapPin: '<path d="M20 10.5c0 6-8 11.5-8 11.5s-8-5.5-8-11.5a8 8 0 1 1 16 0z"/><circle cx="12" cy="10.5" r="2.7"/>',
  wifi: '<path d="M2 8.5a16 16 0 0 1 20 0"/><path d="M5.5 12.2a11 11 0 0 1 13 0"/><path d="M9 15.9a6 6 0 0 1 6 0"/><circle cx="12" cy="19.2" r="1.1" fill="currentColor" stroke="none"/>',
  users: '<circle cx="9" cy="8" r="3.3"/><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3s6.5 2.7 6.5 6.3"/><circle cx="17.2" cy="8.6" r="2.6"/><path d="M15.6 13.9c2.9.4 5 2.7 5 6.1"/>',
  usersGroup: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 20c0-3.3 2.5-5.8 5.6-5.8S14 16.7 14 20"/><path d="M13.5 14.5c2.7.3 4.5 2.6 4.5 5.5"/>',
  barChart: '<path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  checkSquare: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
  fileText: '<path d="M6 2.5h9L20 7v14.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-18a1 1 0 0 1 1-1z"/><path d="M14 2.5V8h5.5M9 13h6M9 17h6"/>',
  ticket: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5V10a2 2 0 0 0 0 4v1.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5V14a2 2 0 0 0 0-4z"/><path d="M10 6v14" stroke-dasharray="3 3"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z"/><path d="M9.5 18.5a2.5 2.5 0 0 0 5 0"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  activity: '<path d="M22 12h-4l-3 8-6-16-3 8H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="m17 3 4 4L9 19l-4.5 1.5L6 16z"/>',
  trash: '<path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5V7z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 21v-5h5"/>',
  download: '<path d="M12 3v13"/><path d="m6 11 6 6 6-6"/><path d="M4 20h16"/>',
  shield: '<path d="M12 3 4 6v6c0 4.6 3.2 8.4 8 9 4.8-.6 8-4.4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  userPlus: '<circle cx="9" cy="8" r="3.3"/><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3s6.5 2.7 6.5 6.3"/><path d="M19 8v6M22 11h-6"/>'
};

function psIcon(name, size) {
  size = size || 18;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${PSIcons[name] || ''}</svg>`;
}