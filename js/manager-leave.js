document.addEventListener('DOMContentLoaded', () => {
  const main = document.getElementById('leaveMain');
  const countEl = document.getElementById('leaveCount');
  const filterSelect = document.getElementById('leaveFilter');
  const bulkApproveBtn = document.getElementById('bulkApproveBtn');
  const bulkRejectBtn = document.getElementById('bulkRejectBtn');

  function chipClass(status) {
    if (status === 'Pending') return 'ps-chip-warn';
    if (status === 'Approved') return 'ps-chip-success';
    return 'ps-chip-danger';
  }

  function fmt(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function selectedIds() {
    return [...main.querySelectorAll('.leave-select:checked')].map(cb => Number(cb.dataset.id));
  }

  function updateBulkButtons() {
    const any = selectedIds().length > 0;
    bulkApproveBtn.style.display = any ? '' : 'none';
    bulkRejectBtn.style.display = any ? '' : 'none';
  }

  async function render() {
    const data = await Store.get();
    const filter = filterSelect.value;
    const requests = data.leaveRequests || [];
    const visible = filter === 'All' ? requests : requests.filter(r => r.status === filter);

    countEl.textContent = `${visible.length} request${visible.length === 1 ? '' : 's'}`;

    main.innerHTML = visible.map((r) => {
      const idx = requests.indexOf(r);
      return `
      <div class="leave-card ${r.status === 'Rejected' ? 'rejected' : ''}" data-index="${idx}">
        <div class="leave-top">
          <div class="leave-user">
            ${r.status === 'Pending' ? `<input type="checkbox" class="leave-select" data-id="${r.id}" style="width:16px; height:16px;">` : ''}
            <div class="leave-avatar">${r.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <div class="leave-name">${r.name}</div>
              <div class="leave-role">${r.role}</div>
            </div>
          </div>
          <span class="ps-chip ${chipClass(r.status)}">${r.status}</span>
        </div>
        <div class="leave-body">
          <div class="leave-detail">
            <div><b>From:</b> ${fmt(r.from)}</div>
            <div><b>To:</b> ${fmt(r.to)}</div>
            <div><b>Reason:</b> ${r.reason}</div>
          </div>
          ${r.status === 'Pending' ? `
          <div class="leave-actions">
            <button class="ps-btn ps-btn-primary btn-approve">Approve</button>
            <button class="ps-btn ps-btn-danger btn-reject">Reject</button>
          </div>` : ''}
        </div>
        <div class="leave-time">${r.appliedOn}</div>
      </div>
    `;
    }).join('') || '<div class="ps-empty">No leave requests match this filter.</div>';

    updateBulkButtons();
    main.querySelectorAll('.leave-select').forEach(cb => cb.addEventListener('change', updateBulkButtons));
  }

  render();
  filterSelect.addEventListener('change', render);

  main.addEventListener('click', async (e) => {
    const card = e.target.closest('.leave-card');
    if (!card) return;
    const idx = Number(card.dataset.index);

    if (e.target.closest('.btn-approve')) {
      const req = (await Store.get()).leaveRequests[idx];
      await Store.updateLeaveStatus(req.id, 'APPROVED');
      render();
    }
    if (e.target.closest('.btn-reject')) {
      const req = (await Store.get()).leaveRequests[idx];
      await Store.updateLeaveStatus(req.id, 'REJECTED');
      render();
    }
  });

  bulkApproveBtn.addEventListener('click', async () => {
    const ids = selectedIds();
    if (!ids.length) return;
    await Store.bulkUpdateLeaveStatus(ids, 'APPROVED');
    render();
  });

  bulkRejectBtn.addEventListener('click', async () => {
    const ids = selectedIds();
    if (!ids.length) return;
    await Store.bulkUpdateLeaveStatus(ids, 'REJECTED');
    render();
  });
});
