import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal, { type ModalField } from '../components/Modal';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { AttendanceRequest, CurrentUser } from '../types/entities';
import '../styles/pages/manager-leave.css';

function fmt(dateStr?: string | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dateRange(r: AttendanceRequest) {
  if (r.startDate && r.endDate && r.startDate !== r.endDate) return fmt(r.startDate) + ' – ' + fmt(r.endDate);
  return fmt(r.startDate || r.endDate);
}

export default function ManagerLeavePage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [requests, setRequests] = useState<AttendanceRequest[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [review, setReview] = useState<{ request: AttendanceRequest; approved: boolean } | null>(null);

  async function load() {
    try {
      setRequests((await AppStore.getPendingAttendanceRequests()) || []);
      setLoadErr(null);
    } catch (err: any) {
      setLoadErr(err?.status === 403 ? 'Needs an org-admin account on their side to review requests.' : (err?.message || "Couldn't load attendance requests."));
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
      await load();
    })();
    return () => { cancelled = true; };
  }, []);

  const reviewFields: ModalField[] = review ? [
    { name: 'remarks', label: 'Remarks', placeholder: review.approved ? 'e.g. Approved, enjoy your leave.' : 'e.g. Insufficient leave balance.' },
  ] : [];

  return (
    <Layout title="Attendance Requests" subtitle="Live from the app (read-only)">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-section-head">
            <div className="ps-section-title">
              {loadErr ? 'Pending requests' : requests === null ? 'Pending requests' : `${requests.length} pending request${requests.length === 1 ? '' : 's'}`}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loadErr ? <div className="ps-empty">{loadErr}</div>
              : requests === null ? 'Loading…'
              : requests.length === 0 ? <div className="ps-empty">No pending attendance requests.</div>
              : requests.map((r) => {
                const name = r.employeeName || ('Employee #' + r.employeeId);
                return (
                  <div className="leave-card" key={r.requestId}>
                    <div className="leave-top">
                      <div className="leave-user">
                        <div className="leave-avatar">{String(name).slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="leave-name">{name}</div>
                          <div className="leave-role">{r.requestType || 'Attendance'} request</div>
                        </div>
                      </div>
                      <span className="ps-chip ps-chip-warn">{r.status || 'Pending'}</span>
                    </div>
                    <div className="leave-body">
                      <div className="leave-detail">
                        <div><b>Dates:</b> {dateRange(r)}</div>
                        <div><b>Reason:</b> {r.reason || '-'}</div>
                      </div>
                      <div className="leave-actions">
                        <button className="ps-btn ps-btn-primary" onClick={() => setReview({ request: r, approved: true })}>Approve</button>
                        <button className="ps-btn ps-btn-danger" onClick={() => setReview({ request: r, approved: false })}>Reject</button>
                      </div>
                    </div>
                    <div className="leave-time">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                  </div>
                );
              })}
          </div>
        </>
      )}

      <Modal
        open={!!review}
        title={review?.approved ? 'Approve attendance request' : 'Reject attendance request'}
        subtitle="Their system requires a short remark with every review."
        submitLabel={review?.approved ? 'Approve' : 'Reject'}
        fields={reviewFields}
        onClose={() => setReview(null)}
        onSubmit={async (values) => {
          if (!review) return;
          try {
            await AppStore.reviewAttendanceRequest(review.request.requestId, review.approved, values.remarks);
            await load();
          } catch (err: any) {
            alert('Could not submit review: ' + err.message);
          }
        }}
      />
    </Layout>
  );
}
