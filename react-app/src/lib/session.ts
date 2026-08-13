/* ============================================================
   Session management — faithful port of the session-related
   portion of gps_fr/js/data.js. The old local-backend REST layer
   (Store.get()/fetchAll() and its org-admin CRUD wrappers) is
   NOT ported: as of the React rewrite, every live page already
   goes through AppStore exclusively for data, and Store.get()
   was only ever used by shell.js to read `.session` — confirmed
   by grepping the current production JS before starting this port.
   ============================================================ */

import type { CurrentUser, Session, SiteRole } from '../types/entities';
import { appLoginAs, clearPersonalAuth } from './appStore';

const SESSION_KEY = 'presenzaSession';

// The app dropped the MANAGER role entirely (one admin does
// everything, one employee role) — map straight to the two site
// roles that matter now.
const APP_ROLE_TO_SITE_ROLE: Record<string, SiteRole> = {
  ORG_ADMIN: 'organization',
  EMPLOYEE: 'employee',
};

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAppSession(appProfile: CurrentUser): Session {
  const session: Session = {
    role: APP_ROLE_TO_SITE_ROLE[appProfile.role] || 'employee',
    name: appProfile.username,
    userId: appProfile.userId,
    email: appProfile.email,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** The only login flow the website uses — authenticates straight
 *  against the app. Whatever error the app throws (invalid
 *  credentials, unreachable, etc.) surfaces as-is to the login form. */
export async function loginWithApp(email: string, password: string): Promise<Session> {
  const appProfile = await appLoginAs(email, password);
  return saveAppSession(appProfile);
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('presenzaToken');
  // Also drop the persisted app JWT — otherwise the next person to use
  // this browser would inherit the previous person's admin session.
  clearPersonalAuth();
}
