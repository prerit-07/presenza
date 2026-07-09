document.addEventListener('DOMContentLoaded', async () => {
  const data = await Store.get();
  const nameInput = document.getElementById('fieldName');
  const domainInput = document.getElementById('fieldDomain');
  const emailInput = document.getElementById('fieldEmail');
  const tzInput = document.getElementById('fieldTimezone');
  const errorBox = document.getElementById('profileError');
  const saveBtn = document.getElementById('saveProfileBtn');
  const saveConfirm = document.getElementById('saveConfirm');

  nameInput.value = data.orgProfile.name;
  domainInput.value = data.orgProfile.domain;
  emailInput.value = data.orgProfile.email;
  tzInput.value = data.orgProfile.timezone;

  function markCurrentPlan(plan) {
    document.querySelectorAll('.plan-option').forEach(card => {
      card.classList.remove('current');
      const badge = card.querySelector('.plan-badge');
      if (badge) badge.remove();
      if (card.dataset.plan === plan) {
        card.classList.add('current');
        const b = document.createElement('span');
        b.className = 'plan-badge';
        b.textContent = 'CURRENT';
        card.prepend(b);
      }
    });
  }
  markCurrentPlan(data.orgProfile.plan);

  document.getElementById('planGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.plan-option');
    if (!card) return;
    const plan = card.dataset.plan;
    markCurrentPlan(plan);
    Store.updateOrgProfile({ plan });
  });

  saveBtn.addEventListener('click', () => {
    errorBox.classList.remove('visible');
    const name = nameInput.value.trim();
    const domain = domainInput.value.trim();
    const email = emailInput.value.trim();
    const timezone = tzInput.value.trim();

    if (!name) {
      errorBox.textContent = 'Organization Name is required.';
      errorBox.classList.add('visible');
      nameInput.focus();
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailPattern.test(email)) {
      errorBox.textContent = 'Enter a valid email address.';
      errorBox.classList.add('visible');
      emailInput.focus();
      return;
    }

    Store.updateOrgProfile({ name, domain, timezone });

    saveConfirm.style.display = 'inline';
    setTimeout(() => { saveConfirm.style.display = 'none'; }, 2000);
  });
});