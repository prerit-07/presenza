import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { CurrentUser, Employee, Ticket, TicketComment } from '../types/entities';
import '../styles/pages/app-tickets.css';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REOPENED', label: 'Reopened' },
];

function chipClass(status?: string) {
  const s = (status || '').toUpperCase();
  if (s === 'OPEN' || s === 'REOPENED') return 'ps-chip-warn';
  if (s === 'RESOLVED' || s === 'CLOSED') return 'ps-chip-success';
  return 'ps-chip-warn';
}

type ModalState = { kind: 'assign' | 'status'; ticketId: number; scope: 'org' | 'mine' } | null;

export default function AppTicketsPage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [orgTickets, setOrgTickets] = useState<Ticket[] | null>(null);
  const [orgErr, setOrgErr] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<Ticket[] | null>(null);
  const [myErr, setMyErr] = useState<string | null>(null);

  const [comments, setComments] = useState<Record<number, TicketComment[] | 'error'>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});

  const [modal, setModal] = useState<ModalState>(null);

  const employeeById: Record<number, string> = {};
  employees.forEach((e) => { employeeById[e.employeeId] = e.employeeName; });
  function employeeOptions() { return employees.map((e) => ({ value: String(e.employeeId), label: e.employeeName })); }

  async function loadComments(ticketId: number) {
    try {
      const c = await AppStore.getTicketComments(ticketId);
      setComments((prev) => ({ ...prev, [ticketId]: c }));
    } catch {
      setComments((prev) => ({ ...prev, [ticketId]: 'error' }));
    }
  }

  async function loadOrgTickets() {
    try {
      const tickets = (await AppStore.getOrganizationTickets()) || [];
      setOrgTickets(tickets);
      setOrgErr(null);
      tickets.forEach((t) => loadComments(t.ticketId));
    } catch (err: any) {
      setOrgTickets([]);
      setOrgErr(err?.message || "Couldn't load this.");
    }
  }

  async function loadMyTickets() {
    try {
      const tickets = (await AppStore.getMyTickets()) || [];
      setMyTickets(tickets);
      setMyErr(null);
      tickets.forEach((t) => loadComments(t.ticketId));
    } catch (err: any) {
      setMyTickets([]);
      setMyErr(err?.message || "Couldn't load this.");
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
      await loadOrgTickets();
      await loadMyTickets();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleComment(ticketId: number) {
    const message = (commentDrafts[ticketId] || '').trim();
    if (!message) return;
    try {
      await AppStore.addTicketComment(ticketId, message);
      setCommentDrafts((d) => ({ ...d, [ticketId]: '' }));
      await loadComments(ticketId);
    } catch (err: any) {
      alert('Could not add comment: ' + err.message);
    }
  }

  async function handleAssign(values: Record<string, string>) {
    if (!modal) return;
    await AppStore.assignTicket(modal.ticketId, Number(values.employeeId));
    if (modal.scope === 'org') await loadOrgTickets(); else await loadMyTickets();
  }

  async function handleStatus(values: Record<string, string>) {
    if (!modal) return;
    await AppStore.updateTicketStatus(modal.ticketId, values.status);
    if (modal.scope === 'org') await loadOrgTickets(); else await loadMyTickets();
  }

  function renderTickets(tickets: Ticket[] | null, err: string | null, admin: boolean, scope: 'org' | 'mine') {
    if (err) return <div className="ps-empty">Couldn't load this ({err}).</div>;
    if (tickets === null) return 'Loading…';
    if (!tickets.length) return <div className="ps-empty">No tickets.</div>;
    return tickets.map((t) => {
      const assignedId = t.assignedToEmployeeId;
      const assignedName = assignedId != null ? (employeeById[assignedId] || ('#' + assignedId)) : 'Unassigned';
      const c = comments[t.ticketId];
      return (
        <div className="ticket-card" key={t.ticketId}>
          <div className="ticket-top">
            <div className="ticket-subject">{t.subject || 'Ticket'}</div>
            <span className={`ps-chip ${chipClass(t.status)}`}>{t.status || 'OPEN'}</span>
          </div>
          {t.description ? <div className="ticket-desc">{t.description}</div> : null}
          <div className="ticket-desc">Assigned to: {assignedName}</div>
          <div className="ticket-desc">
            Comments: {c === undefined ? '—' : c === 'error' ? '—' : c.length ? c.map((cm) => cm.message).join(' · ') : 'No comments yet.'}
          </div>
          <div className="ps-field">
            <input
              type="text"
              className="ticket-comment-input"
              style={{ marginTop: 8 }}
              placeholder="Add a comment…"
              value={commentDrafts[t.ticketId] || ''}
              onChange={(e) => setCommentDrafts((d) => ({ ...d, [t.ticketId]: e.target.value }))}
            />
          </div>
          <div className="tix-actions" style={{ marginTop: 8 }}>
            <button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => handleComment(t.ticketId)}>Comment</button>
            {admin ? (
              <>
                <button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setModal({ kind: 'assign', ticketId: t.ticketId, scope })}>Assign</button>
                <button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setModal({ kind: 'status', ticketId: t.ticketId, scope })}>Change status</button>
              </>
            ) : null}
          </div>
          {t.createdAt ? <div className="ticket-time">{new Date(t.createdAt).toLocaleString()}</div> : null}
        </div>
      );
    });
  }

  return (
    <Layout title="Support Tickets" subtitle="Live from the app — comment, assign, and update status">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-section-head"><div className="ps-section-title">Organization tickets</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {renderTickets(orgTickets, orgErr, true, 'org')}
          </div>

          <div className="ps-section-head"><div className="ps-section-title">My tickets</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {renderTickets(myTickets, myErr, false, 'mine')}
          </div>
        </>
      )}

      <Modal
        open={modal?.kind === 'assign'}
        title="Assign ticket"
        submitLabel="Assign"
        fields={[{ name: 'employeeId', label: 'Assign to', type: 'select', options: employeeOptions() }]}
        onSubmit={handleAssign}
        onClose={() => setModal(null)}
      />
      <Modal
        open={modal?.kind === 'status'}
        title="Change ticket status"
        submitLabel="Save"
        fields={[{ name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS }]}
        onSubmit={handleStatus}
        onClose={() => setModal(null)}
      />
    </Layout>
  );
}
