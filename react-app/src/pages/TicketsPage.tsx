import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { CurrentUser, DeviceChangeRequest, Employee } from '../types/entities';
import '../styles/pages/tickets.css';

export default function TicketsPage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<DeviceChangeRequest[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const employeeByUserId: Record<number, string> = {};
  employees.forEach((e) => { employeeByUserId[e.userId] = e.employeeName; });

  async function load() {
    try {
      setRequests((await AppStore.getPendingDeviceChangeRequests()) || []);
      setLoadErr(null);
    } catch (err: any) {
      setLoadErr(err?.status === 403 ? 'Needs an org-admin account on their side to review requests.' : (err?.message || "Couldn't load device change requests."));
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!appHasPersonalLogin()) await appEnsureToken();
        const meRes = await AppStore.getMe();
        if (cancelled) return;
        setMe(meRes);
      } catch (err: any) {
        if (!cancelled) setConnError(err?.message || 'Could not connect.');
        return;
      }
      try { setEmployees(await AppStore.getAllEmployees()); } catch { /* non-fatal */ }
      await load();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReview(requestId: number, approved: boolean) {
    if (!confirm((approved ? 'Approve' : 'Reject') + ' this device change request?')) return;
    try {
      await AppStore.reviewDeviceChangeRequest(requestId, approved);
      await load();
    } catch (err: any) {
      alert('Could not submit review: ' + err.message);
    }
  }

  return (
    <Layout title="Device Change Requests" subtitle="Live from the app (read-only)">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-section-head"><div className="ps-section-title">Pending device change requests</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loadErr ? <div className="ps-empty">{loadErr}</div>
              : requests === null ? 'Loading…'
              : requests.length === 0 ? <div className="ps-empty">No pending device change requests.</div>
              : requests.map((r) => {
                const name = employeeByUserId[r.userId] || ('User #' + r.userId);
                return (
                  <div className="tix-card" key={r.requestId}>
                    <div className="tix-top">
                      <div className="tix-user">
                        <div className="tix-avatar">{String(name).slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="tix-name">{name}</div>
                          <div className="tix-section">Device change request</div>
                        </div>
                      </div>
                      <span className="ps-chip ps-chip-warn">{r.status || 'Pending'}</span>
                    </div>
                    <div className="tix-body">
                      <div className="tix-devices">
                        <div><b>OLD DEVICE:</b> {r.oldDeviceId || '—'}</div>
                        <div><b>NEW DEVICE:</b> {r.newDeviceId || '—'}</div>
                        <div><b>Reason:</b> {r.reason || '-'}</div>
                      </div>
                      <div className="tix-actions">
                        <button className="ps-btn ps-btn-primary" onClick={() => handleReview(r.requestId, true)}>Approve</button>
                        <button className="ps-btn ps-btn-danger" onClick={() => handleReview(r.requestId, false)}>Reject</button>
                      </div>
                    </div>
                    <div className="tix-time">{r.requestedAt ? new Date(r.requestedAt).toLocaleString() : ''}</div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </Layout>
  );
}
