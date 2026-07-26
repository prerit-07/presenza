document.addEventListener('DOMContentLoaded', async () => {
  const banner = document.getElementById('appConnBanner');
  const orgTicketsBody = document.getElementById('orgTicketsBody');
  const myTicketsBody = document.getElementById('myTicketsBody');

  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    banner.innerHTML = `<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>${escapeAppHtml(me.username)}</b> (${escapeAppHtml(me.role)})`;
  } catch (err) {
    banner.innerHTML = `<span class="ps-chip ps-chip-danger">Not connected</span> ${escapeAppHtml(err.message)}`;
    return;
  }

  let employees = [];
  try { employees = await AppStore.getAllEmployees(); } catch { /* non-fatal */ }
  const employeeById = {}; employees.forEach(e => { employeeById[e.employeeId] = e.employeeName; });
  function employeeOptions() { return employees.map(e => ({ value: String(e.employeeId), label: e.employeeName })); }

  const STATUS_OPTIONS = [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'REOPENED', label: 'Reopened' },
  ];

  function chipClass(status) {
    const s = (status || '').toUpperCase();
    if (s === 'OPEN' || s === 'REOPENED') return 'ps-chip-warn';
    if (s === 'RESOLVED' || s === 'CLOSED') return 'ps-chip-success';
    return 'ps-chip-warn';
  }

  function renderTickets(tickets, opts) {
    opts = opts || {};
    if (!tickets || !tickets.length) return '<div class="ps-empty">No tickets.</div>';
    return tickets.map((t) => {
      const assignedName = t.assignedToEmployeeId != null ? (employeeById[t.assignedToEmployeeId] || ('#' + t.assignedToEmployeeId)) : 'Unassigned';
      return `
        <div class="ticket-card" data-ticket-id="${t.ticketId}">
          <div class="ticket-top">
            <div class="ticket-subject">${escapeAppHtml(t.subject || 'Ticket')}</div>
            <span class="ps-chip ${chipClass(t.status)}">${escapeAppHtml(t.status || 'OPEN')}</span>
          </div>
          ${t.description ? `<div class="ticket-desc">${escapeAppHtml(t.description)}</div>` : ''}
          <div class="ticket-desc">Assigned to: ${escapeAppHtml(assignedName)}</div>
          <div id="comments-${t.ticketId}" class="ticket-desc">Comments: —</div>
          <div class="ps-field">
            <input type="text" class="ticket-comment-input" placeholder="Add a comment…" style="margin-top:8px;">
          </div>
          <div class="tix-actions" style="margin-top:8px;">
            <button class="ps-btn ps-btn-ghost ps-btn-sm btn-comment">Comment</button>
            ${opts.admin ? `<button class="ps-btn ps-btn-ghost ps-btn-sm btn-assign">Assign</button><button class="ps-btn ps-btn-ghost ps-btn-sm btn-status">Change status</button>` : ''}
          </div>
          ${t.createdAt ? `<div class="ticket-time">${escapeAppHtml(new Date(t.createdAt).toLocaleString())}</div>` : ''}
        </div>`;
    }).join('');
  }

  async function loadComments(ticketId) {
    const el = document.getElementById('comments-' + ticketId);
    if (!el) return;
    try {
      const comments = await AppStore.getTicketComments(ticketId);
      el.textContent = comments.length ? comments.map(c => c.message).join(' · ') : 'No comments yet.';
    } catch {
      el.textContent = 'Comments: —';
    }
  }

  async function loadOrgTickets() {
    try {
      const tickets = await AppStore.getOrganizationTickets();
      orgTicketsBody.innerHTML = renderTickets(tickets, { admin: true });
      tickets.forEach(t => loadComments(t.ticketId));
    } catch (err) {
      orgTicketsBody.innerHTML = `<div class="ps-empty">Couldn't load this (${escapeAppHtml(err.message)}).</div>`;
    }
  }

  async function loadMyTickets() {
    try {
      const tickets = await AppStore.getMyTickets();
      myTicketsBody.innerHTML = renderTickets(tickets, { admin: false });
      tickets.forEach(t => loadComments(t.ticketId));
    } catch (err) {
      myTicketsBody.innerHTML = `<div class="ps-empty">Couldn't load this (${escapeAppHtml(err.message)}).</div>`;
    }
  }

  function wireActions(container, reload) {
    container.addEventListener('click', async (e) => {
      const card = e.target.closest('.ticket-card');
      if (!card) return;
      const ticketId = Number(card.dataset.ticketId);

      if (e.target.closest('.btn-comment')) {
        const input = card.querySelector('.ticket-comment-input');
        const message = input.value.trim();
        if (!message) return;
        try {
          await AppStore.addTicketComment(ticketId, message);
          input.value = '';
          await loadComments(ticketId);
        } catch (err) {
          alert('Could not add comment: ' + err.message);
        }
        return;
      }

      if (e.target.closest('.btn-assign')) {
        PSModal.open({
          title: 'Assign ticket',
          submitLabel: 'Assign',
          fields: [{ name: 'employeeId', label: 'Assign to', type: 'select', options: employeeOptions() }],
          onSubmit: async (values) => {
            await AppStore.assignTicket(ticketId, Number(values.employeeId));
            await reload();
          },
        });
        return;
      }

      if (e.target.closest('.btn-status')) {
        PSModal.open({
          title: 'Change ticket status',
          submitLabel: 'Save',
          fields: [{ name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS }],
          onSubmit: async (values) => {
            await AppStore.updateTicketStatus(ticketId, values.status);
            await reload();
          },
        });
      }
    });
  }

  await loadOrgTickets();
  await loadMyTickets();
  wireActions(orgTicketsBody, loadOrgTickets);
  wireActions(myTicketsBody, loadMyTickets);
});
