/* ============================================================
   Layout — React port of shell.js's DOM-building IIFE.
   Renders the hero header (logo, title, notif bell, account
   menu) + nav sidebar + main content area, exactly matching the
   original markup/classes so the existing theme.css applies
   unchanged. Auth/role gating itself lives in <AuthGuard> —
   this component assumes a valid session already exists.
   ============================================================ */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { PS_NAV } from '../lib/nav';
import { useSession } from '../lib/SessionContext';
import { psBuildNotifications, psTimeAgo, type NotifItem } from '../lib/notifications';

export default function Layout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { session, logout } = useSession();
  const navigate = useNavigate();

  const role = session!.role;
  const navItems = PS_NAV[role] || [];
  const initials = (session?.name || 'A').slice(0, 2).toUpperCase();

  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<NotifItem[] | null>(null);
  const [notifError, setNotifError] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  // Load real notifications once per role (mirrors the original's
  // fire-once-on-render IIFE inside DOMContentLoaded).
  useEffect(() => {
    let cancelled = false;
    setNotifItems(null);
    setNotifError(false);
    psBuildNotifications(role)
      .then((items) => { if (!cancelled) setNotifItems(items); })
      .catch(() => { if (!cancelled) setNotifError(true); });
    return () => { cancelled = true; };
  }, [role]);

  // Apply the .app-shell class to the real <body> element, matching the
  // original body.classList.add('app-shell') — theme.css's body.app-shell
  // rule (margin/background/font) is written against the real <body>.
  useEffect(() => {
    document.body.classList.add('app-shell');
    return () => { document.body.classList.remove('app-shell'); };
  }, []);

  // Click-outside-to-close, same behavior as the original document click listener.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target) && target !== notifBtnRef.current) {
        setNotifOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(target) && target !== avatarBtnRef.current) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <header className="ps-hero">
        <div className="ps-hero-blobs" aria-hidden="true">
          <span className="b b1" /><span className="b b2" /><span className="b b3" />
          <span className="b b4" /><span className="b b5" /><span className="b b6" />
          <span className="b b7" /><span className="b b8" />
        </div>
        <div className="ps-hero-inner">
          <NavLink to={role === 'organization' ? '/organization' : '/employee'} className="ps-hero-logo">
            <span className="mark"><img src="/images/presenza-logo.svg" alt="Presenza" className="ps-logo" /></span>
            <span className="name">Presenza</span>
          </NavLink>
          <div className="ps-hero-titlewrap">
            <h1 className="ps-hero-title">{title}</h1>
            {subtitle ? <p className="ps-hero-subtitle">{subtitle}</p> : null}
          </div>
          <div className="ps-hero-actions">
            <button
              ref={notifBtnRef}
              className="ps-icon-btn ps-icon-btn-ghost"
              onClick={(e) => { e.stopPropagation(); setAccountOpen(false); setNotifOpen((v) => !v); }}
            >
              <Icon name="bell" size={18} />
              <span className="ps-badge-dot" />
            </button>
            <div ref={notifRef} className={'ps-notif-panel' + (notifOpen ? ' open' : '')}>
              <div className="ps-notif-header">Notifications</div>
              {notifItems === null && !notifError && (
                <div className="ps-notif-loading" style={{ padding: 16, fontSize: 12.5, color: '#71717a' }}>Loading…</div>
              )}
              {notifError && (
                <div className="ps-notif-empty" style={{ padding: 16, fontSize: 12.5, color: '#71717a' }}>Couldn't load notifications.</div>
              )}
              {notifItems !== null && !notifError && notifItems.length === 0 && (
                <div className="ps-notif-empty" style={{ padding: 16, fontSize: 12.5, color: '#71717a' }}>No new notifications.</div>
              )}
              {notifItems !== null && !notifError && notifItems.map((n, i) => (
                <div className="ps-notif-item" key={i}>
                  <div className="ps-notif-icon"><Icon name={n.icon} size={15} /></div>
                  <div>
                    <div className="ps-notif-text">{n.text}</div>
                    <div className="ps-notif-time">{psTimeAgo(n.time)}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              ref={avatarBtnRef}
              className="ps-hero-avatar"
              onClick={(e) => { e.stopPropagation(); setNotifOpen(false); setAccountOpen((v) => !v); }}
            >
              {initials}
            </button>
            <div ref={accountRef} className={'ps-account-panel' + (accountOpen ? ' open' : '')}>
              <div className="ps-account-name">{session?.name || 'Guest'}</div>
              <div className="ps-account-role">{session?.role || ''}</div>
              <button
                className="ps-btn ps-btn-ghost"
                style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                onClick={handleLogout}
              >
                <Icon name="logout" size={15} /> Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="ps-nav-strip">
        <ul className="ps-nav">
          {navItems.map((item) => (
            <li key={item.key}>
              <NavLink to={item.href} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={item.icon} size={17} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="ps-main-area">
        <main className="ps-content">{children}</main>
      </div>
    </>
  );
}
