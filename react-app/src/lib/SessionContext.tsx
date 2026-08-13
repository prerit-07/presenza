/* ============================================================
   React session context — SPA-friendly wrapper around session.ts.
   Provides reactive session state (needed since this is now a
   client-side-routed SPA instead of full-page navigations, which
   is what read fresh localStorage on every page load originally).
   ============================================================ */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '../types/entities';
import { loginWithApp as loginWithAppImpl, logout as logoutImpl, readSession } from './session';

interface SessionContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  const login = useCallback(async (email: string, password: string) => {
    const s = await loginWithAppImpl(email, password);
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    logoutImpl();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
