document.addEventListener('DOMContentLoaded', () => {
  /* ===== Monthly / Yearly toggle ===== */
  const ptSwitch = document.getElementById('ptSwitch');
  const ptLabels = document.querySelectorAll('.pt-label');
  const amounts = document.querySelectorAll('.pc-amount[data-monthly]');

  ptSwitch?.addEventListener('click', () => {
    const yearly = !ptSwitch.classList.contains('on');
    ptSwitch.classList.toggle('on', yearly);
    ptLabels.forEach(l => l.classList.toggle('active', l.dataset.mode === (yearly ? 'yearly' : 'monthly')));
    amounts.forEach(a => { a.textContent = yearly ? a.dataset.yearly : a.dataset.monthly; });
  });

  /* ===== Comparison table ===== */
  const rows = [
    { feature: 'Minimum members', free: '1', standard: '1', enterprise: '1' },
    { feature: 'Member limit', free: '25', standard: '200', enterprise: '1000+' },
    { feature: 'Geofence zones', free: '1 zone', standard: 'Unlimited', enterprise: 'Unlimited, multi-branch' },
    { feature: 'WiFi BSSID verification', free: true, standard: true, enterprise: true },
    { feature: 'GPS geofencing', free: true, standard: true, enterprise: true },
    { feature: 'Device-locked check-in', free: false, standard: true, enterprise: true },
    { feature: 'Real-time analytics dashboard', free: false, standard: true, enterprise: true },
    { feature: 'Leave & roster automation', free: false, standard: true, enterprise: true },
    { feature: 'Custom join codes', free: true, standard: true, enterprise: true },
    { feature: 'API access', free: false, standard: false, enterprise: true },
    { feature: 'SSO / SAML', free: false, standard: false, enterprise: true },
    { feature: 'Dedicated onboarding', free: false, standard: false, enterprise: true },
    { feature: 'SLA-backed uptime', free: false, standard: false, enterprise: true },
    { feature: 'Support', free: 'Email', standard: 'Priority email', enterprise: '24/7 priority' }
  ];

  function cell(val, extraClass) {
    let cls = extraClass ? [extraClass] : [];
    let content;
    if (val === true) { cls.push('yes'); content = '✓'; }
    else if (val === false) { cls.push('no'); content = '—'; }
    else { content = val; }
    return `<td${cls.length ? ` class="${cls.join(' ')}"` : ''}>${content}</td>`;
  }

  const compareBody = document.getElementById('compareBody');
  if (compareBody) {
    compareBody.innerHTML = rows.map(r => `
      <tr>
        <td class="ct-feature-col">${r.feature}</td>
        ${cell(r.free)}
        ${cell(r.standard, 'ct-featured-col')}
        ${cell(r.enterprise)}
      </tr>
    `).join('');
  }

  /* ===== FAQ accordion ===== */
  const faqs = [
    { q: 'Is the Free plan really free forever?', a: 'Yes. The Free plan never expires and covers teams of up to 25 members with core geofencing and WiFi verification — no credit card required.' },
    { q: 'Can I switch plans later?', a: 'Absolutely. Upgrade or downgrade anytime from Organisation Setup in your dashboard — changes apply immediately and billing is prorated.' },
    { q: 'What counts as a "member"?', a: 'Any user who logs attendance — employees, students, or field staff. Organization admins and managers are not counted toward your member limit.' },
    { q: 'Do you offer a discount for annual billing?', a: 'Yes, switching to yearly billing saves you more than 20% compared to paying monthly, on the Standard plan.' },
    { q: 'How does Enterprise pricing work?', a: 'Enterprise pricing is based on member count, number of branches, and any custom integrations you need. Reach out and we\'ll put together a quote within one business day.' },
    { q: 'Is my organization\'s data secure?', a: 'All data is encrypted in transit and at rest. Geofence and WiFi BSSID data never leaves your organization\'s workspace.' }
  ];

  const faqList = document.getElementById('faqList');
  if (faqList) {
    faqList.innerHTML = faqs.map((f, i) => `
      <div class="faq-item" data-index="${i}">
        <div class="faq-q"><span>${f.q}</span><span class="faq-plus">+</span></div>
        <div class="faq-a"><p>${f.a}</p></div>
      </div>
    `).join('');

    faqList.querySelectorAll('.faq-item').forEach(item => {
      const q = item.querySelector('.faq-q');
      const a = item.querySelector('.faq-a');
      q.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqList.querySelectorAll('.faq-item.open').forEach(open => {
          open.classList.remove('open');
          open.querySelector('.faq-a').style.maxHeight = null;
        });
        if (!isOpen) {
          item.classList.add('open');
          a.style.maxHeight = a.scrollHeight + 'px';
        }
      });
    });
  }
});
