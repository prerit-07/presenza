document.addEventListener('DOMContentLoaded', () => {
  const features = [
    { icon: 'shield', title: 'Spoof-Proof Verification', text: 'A smart two-layered system — GPS geofencing combined with workplace WiFi BSSID — completely eliminates fake or proxy attendance.' },
    { icon: 'zap', title: 'Zero-Friction Onboarding', text: 'Organizations get unique join codes instantly. Admins and members onboard themselves in seconds — no manual setup required.' },
    { icon: 'refresh', title: 'Automated Admin Workflows', text: 'Leave approvals automatically update attendance records. Nothing falls through the cracks, nothing needs re-entering.' },
    { icon: 'layout', title: 'Unified Role Dashboards', text: 'One platform, three purpose-built experiences — for the Organization, the Manager, and every Employee or Student.' },
    { icon: 'barChart', title: 'Real-Time Analytics', text: 'Track attendance trends, late-comer patterns, and status breakdowns with live charts — export reports in one click.' },
    { icon: 'smartphone', title: 'Device-Locked Check-In', text: 'Each member is tied to a registered device. Device change requests route through a manager review queue.' }
  ];

  const steps = [
    {
      title: 'Create Your Workspace', text: 'Sign up and instantly receive unique join codes — no complex setup or manual data entry.',
      visual: `<div class="sv-frame-bar"><span class="sv-dot r"></span><span class="sv-dot y"></span><span class="sv-dot g"></span></div>
        <div class="sv-frame-body sv-workspace">
          <span class="sv-label">Your join code</span>
          <span class="sv-code">XJ4K-9P2Q</span>
          <span class="sv-btn">Create Workspace</span>
        </div>`
    },
    {
      title: 'Join The Platform', text: 'Admins and members enter their join code to reach a personalized dashboard with the correct role.',
      visual: `<div class="sv-frame-bar"><span class="sv-dot r"></span><span class="sv-dot y"></span><span class="sv-dot g"></span></div>
        <div class="sv-frame-body sv-join">
          <span class="sv-label">Enter join code</span>
          <div class="sv-input"><span class="sv-caret">XJ4K-9P2Q</span><span class="sv-cursor"></span></div>
          <div class="sv-roles">
            <span class="sv-role-chip active">Manager</span>
            <span class="sv-role-chip">Employee</span>
          </div>
        </div>`
    },
    {
      title: 'Secure Check-In', text: 'Users mark attendance from their phone — GPS and WiFi jointly verify physical presence.',
      visual: `<div class="sv-frame-bar"><span class="sv-dot r"></span><span class="sv-dot y"></span><span class="sv-dot g"></span></div>
        <div class="sv-frame-body sv-checkin">
          <span class="sv-check-btn"><span class="sv-check-dot"></span>Check In</span>
          <div class="sv-badges">
            <span class="sv-badge">GPS ✓</span>
            <span class="sv-badge">WiFi ✓</span>
          </div>
          <span class="sv-timestamp">Verified at 9:02 AM · Room 101</span>
        </div>`
    },
    {
      title: 'Automated Management', text: 'Leave requests and shift rosters sync automatically the moment an admin approves them.',
      visual: `<div class="sv-frame-bar"><span class="sv-dot r"></span><span class="sv-dot y"></span><span class="sv-dot g"></span></div>
        <div class="sv-frame-body sv-auto">
          <div class="sv-row"><span>Priya Sharma — Leave request</span><span class="sv-status">Approved</span></div>
          <div class="sv-row"><span>Weekly roster</span><span class="sv-status">Synced</span></div>
          <div class="sv-row"><span>Attendance record</span><span class="sv-status">Updated</span></div>
        </div>`
    }
  ];

  const roles = [
    { cls: 'role-org', icon: 'barChart', title: 'Organization', text: "Bird's-eye view across all branches — compliance metrics, location maps, and department-level insight." },
    { cls: 'role-mgr', icon: 'usersGroup', title: 'Manager', text: 'Manage employees, configure geofences and BSSID zones, review alerts, and generate attendance reports.' }
  ];

  const featureGridEl = document.getElementById('featureGrid');
  if (featureGridEl) featureGridEl.innerHTML = features.map(f => `
    <div class="mkt-feature-card reveal">
      <div class="mkt-feature-icon">${psIcon(f.icon, 20)}</div>
      <h3>${f.title}</h3>
      <p>${f.text}</p>
    </div>
  `).join('');

  const stepsGridEl = document.getElementById('stepsGrid');
  if (stepsGridEl) stepsGridEl.innerHTML = steps.map((s, i) => `
    <div class="mkt-step-row reveal${i % 2 ? ' reverse' : ''}">
      <div class="mkt-step-copy">
        <span class="mkt-step-num">STEP 0${i + 1}</span>
        <h3>${s.title}</h3>
        <p>${s.text}</p>
      </div>
      <div class="mkt-step-visual-wrap">
        <div class="sv-frame">
          ${s.visual}
        </div>
      </div>
    </div>
  `).join('');

  const rolesGridEl = document.getElementById('rolesGrid');
  if (rolesGridEl) rolesGridEl.innerHTML = roles.map(r => `
    <div class="mkt-role-card reveal ${r.cls}">
      <div class="mkt-role-icon">${psIcon(r.icon, 21)}</div>
      <h3>${r.title}</h3>
      <p>${r.text}</p>
    </div>
  `).join('');

  document.querySelectorAll('.mkt-section-head').forEach(h => h.classList.add('reveal'));

  /* ===== Real Leaflet/OpenStreetMap maps (decorative, non-interactive) ===== */
  function initDecorativeMap(id, zoom) {
    const el = document.getElementById(id);
    if (!el || !window.L) return;
    const map = L.map(id, {
      center: [30.7413, 76.7684],
      zoom: zoom,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
  }

  initDecorativeMap('heroMap', 15);
  initDecorativeMap('capMiniMap', 14);

  /* ===== Scroll-reveal: fade + rise elements into view once ===== */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  /* ===== Analytics mini-card bars: animate in once, when scrolled into view ===== */
  const bars = document.getElementById('analyticsBars');
  if (bars && 'IntersectionObserver' in window) {
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          bars.classList.add('in-view');
          barObserver.disconnect();
        }
      });
    }, { threshold: 0.4 });
    barObserver.observe(bars);
  } else if (bars) {
    bars.classList.add('in-view');
  }

  /* ===== Mouse-reactive particle / constellation network ===== */
  function initParticleNetwork(container, canvas, opts) {
    if (!container || !canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];
    const mouse = { x: null, y: null };
    const density = opts.density || 16000;
    const maxCount = opts.max || 60;
    const minCount = opts.min || 18;
    const linkDist = opts.linkDist || 105;
    const mouseDist = opts.mouseDist || 130;
    const dotColor = opts.dotColor || 'rgba(109,63,214,0.55)';
    const lineColor = opts.lineColor || ((o) => `rgba(109,63,214,${o})`);
    const mouseLineColor = opts.mouseLineColor || ((o) => `rgba(34,211,201,${o})`);

    function resize() {
      w = canvas.width = container.offsetWidth;
      h = canvas.height = container.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const count = Math.max(minCount, Math.min(maxCount, Math.floor((w * h) / density)));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.4 + 1
      });
    }

    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    container.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

    function tick() {
      ctx.clearRect(0, 0, w, h);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        if (mouse.x !== null) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110 && dist > 0.01) {
            const force = (110 - dist) / 110;
            p.x += (dx / dist) * force * 1.4;
            p.y += (dy / dist) * force * 1.4;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = lineColor(0.2 * (1 - dist / linkDist));
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        if (mouse.x !== null) {
          const dx = particles[i].x - mouse.x, dy = particles[i].y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseDist) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = mouseLineColor(0.45 * (1 - dist / mouseDist));
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(tick);
    }
    tick();
  }

  initParticleNetwork(
    document.querySelector('.mkt-hero'),
    document.getElementById('heroNetCanvas'),
    { density: 15000, max: 65, min: 24 }
  );

  initParticleNetwork(
    document.querySelector('.mkt-cta-banner'),
    document.getElementById('ctaNetCanvas'),
    {
      density: 20000, max: 36, min: 14, linkDist: 90, mouseDist: 110,
      dotColor: 'rgba(196,181,253,0.7)',
      lineColor: (o) => `rgba(196,181,253,${o})`,
      mouseLineColor: (o) => `rgba(94,234,212,${o})`
    }
  );

  /* ===== Navbar shadow on scroll ===== */
  const navbar = document.querySelector('.mkt-navbar');
  if (navbar) {
    const toggleNavShadow = () => navbar.classList.toggle('scrolled', window.scrollY > 8);
    toggleNavShadow();
    window.addEventListener('scroll', toggleNavShadow, { passive: true });
  }
});
