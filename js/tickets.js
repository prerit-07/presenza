document.addEventListener('DOMContentLoaded', () => {
  const main = document.getElementById('tixMain');
  const bulkAcceptBtn = document.getElementById('bulkAcceptBtn');
  const bulkRejectBtn = document.getElementById('bulkRejectTicketsBtn');

  function chipClass(status) {
    if (status === 'Pending') return 'ps-chip-warn';
    if (status === 'Accepted') return 'ps-chip-success';
    return 'ps-chip-danger';
  }

  function selectedIds() {
    return [...main.querySelectorAll('.tix-select:checked')].map(cb => Number(cb.dataset.id));
  }

  function updateBulkButtons() {
    const any = selectedIds().length > 0;
    bulkAcceptBtn.style.display = any ? '' : 'none';
    bulkRejectBtn.style.display = any ? '' : 'none';
  }

  async function render() {
    const data = await Store.get();
    main.innerHTML = data.tickets.map((t, idx) => `
      <div class="tix-card ${t.status === 'Rejected' ? 'rejected' : ''}" data-index="${idx}">
        <div class="tix-top">
          <div class="tix-user">
            ${t.status === 'Pending' ? `<input type="checkbox" class="tix-select" data-id="${t.id}" style="width:16px; height:16px;">` : ''}
            <div class="tix-avatar">${t.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <div class="tix-name">${t.name}</div>
              <div class="tix-section">${t.section}</div>
            </div>
          </div>
          <span class="ps-chip ${chipClass(t.status)}">${t.status}</span>
        </div>
        <div class="tix-body">
          <div class="tix-devices">
            <div><b>OLD DEVICE:</b> ${t.oldDevice}</div>
            <div><b>NEW DEVICE:</b> ${t.newDevice}</div>
            <div><b>Reason:</b> ${t.reason}</div>
          </div>
          ${t.status === 'Pending' ? `
          <div class="tix-actions">
            <button class="ps-btn ps-btn-primary btn-accept">Accept</button>
            <button class="ps-btn ps-btn-danger btn-reject">Reject</button>
          </div>` : ''}
        </div>
        <div class="tix-time">${t.time}</div>
      </div>
    `).join('') || '<div class="ps-empty">No pending tickets.</div>';

    updateBulkButtons();
    main.querySelectorAll('.tix-select').forEach(cb => cb.addEventListener('change', updateBulkButtons));
  }

  render();

  main.addEventListener('click', async (e) => {
    const card = e.target.closest('.tix-card');
    if (!card) return;
    const idx = Number(card.dataset.index);
    const ticket = (await Store.get()).tickets[idx];

    if (e.target.closest('.btn-accept')) {
      await Store.updateTicketStatus(ticket.id, 'ACCEPTED');
      render();
    }
    if (e.target.closest('.btn-reject')) {
      await Store.updateTicketStatus(ticket.id, 'REJECTED');
      render();
    }
  });

  bulkAcceptBtn.addEventListener('click', async () => {
    const ids = selectedIds();
    if (!ids.length) return;
    await Store.bulkUpdateTicketStatus(ids, 'ACCEPTED');
    render();
  });

  bulkRejectBtn.addEventListener('click', async () => {
    const ids = selectedIds();
    if (!ids.length) return;
    await Store.bulkUpdateTicketStatus(ids, 'REJECTED');
    render();
  });
});
