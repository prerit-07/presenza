document.addEventListener('DOMContentLoaded', async () => {
  const data = await Store.get();

  document.getElementById('mgrIcon').innerHTML = psIcon('key', 22);
  document.getElementById('empIcon').innerHTML = psIcon('key', 22);
  document.getElementById('managerCode').textContent = data.codes.manager;
  document.getElementById('employeeCode').textContent = data.codes.employee;
  document.getElementById('codeExpiry').value = data.codes.expiry;
  document.getElementById('codeMaxUses').value = data.codes.maxUses;

  function copyText(el) {
    const text = el.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      const original = el.textContent;
      el.textContent = 'Copied!';
      setTimeout(() => { el.textContent = original; }, 1500);
    });
  }

  // Click-to-copy on the code value itself
  document.querySelectorAll('.code-value').forEach((el) => {
    el.style.cursor = 'pointer';
    el.title = 'Click to copy';
    el.addEventListener('click', () => copyText(el));
  });

  // Explicit "Copy code" buttons
  document.querySelectorAll('.code-copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.copyTarget);
      if (target) copyText(target);
    });
  });

  // Regenerate buttons — require confirmation before changing.
  // NOTE: scoped to .code-regen-btn specifically (not a generic [data-role] selector) —
  // the page <body> also carries a data-role attribute for nav routing, and a broad
  // selector previously matched it too, firing this handler on every click on the page.
  document.querySelectorAll('.code-regen-btn[data-regen-role]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const role = btn.dataset.regenRole;
      const label = role === 'manager' ? 'Manager' : 'Employee';
      if (!confirm(`Regenerate the ${label} join code?\n\nAnyone currently using the old code will no longer be able to join.`)) return;
      const codeId = role === 'manager' ? data.codes.managerId : data.codes.employeeId;
      const targetId = role === 'manager' ? 'managerCode' : 'employeeCode';
      const updated = await Store.regenerateCode(codeId);
      document.getElementById(targetId).textContent = updated.code;
    });
  });

  document.getElementById('codeExpiry').addEventListener('change', (e) => {
    const codeId = data.codes.managerId || data.codes.employeeId;
    Store.updateCodeSettings(codeId, { expiry: e.target.value });
  });

  document.getElementById('codeMaxUses').addEventListener('change', (e) => {
    const codeId = data.codes.managerId || data.codes.employeeId;
    Store.updateCodeSettings(codeId, { maxUses: e.target.value });
  });
});
