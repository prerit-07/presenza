/* ============================================================
   AuthGuard — React Router port of Store.requireAuth(allowedRoles).
   Renders nested routes via <Outlet/> when the session's role is
   allowed; otherwise redirects to /login, exactly like the
   original synchronous localStorage-only check (no network call).
   ============================================================ */

import { Navigate, Outlet } from 'react-router-dom';
import type { SiteRole } from '../types/entities';
import { useSession } from '../lib/SessionContext';

export default function AuthGuard({ allowedRoles }: { allowedRoles: SiteRole[] }) {
  const { session } = useSession();

  if (!session || !allowedRoles.includes(session.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
