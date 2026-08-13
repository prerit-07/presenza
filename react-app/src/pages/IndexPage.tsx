import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';

type Feature = { icon: IconName; title: string; text: string };
type Step = { title: string; text: string; visual: string };
type Role = { cls: string; icon: IconName; title: string; text: string };

const FEATURES: Feature[] = [
  { icon: 'shield', title: 'Spoof-Proof Verification', text: 'A smart two-layered system — GPS geofencing combined with workplace WiFi BSSID — completely eliminates fake or proxy attendance.' },
  { icon: 'zap', title: 'Zero-Friction Onboarding', text: 'Organizations get unique join codes instantly. Admins and members onboard themselves in seconds — no manual setup required.' },
  { icon: 'refresh', title: 'Automated Admin Workflows', text: 'Leave approvals automatically update attendance records. Nothing falls through the cracks, nothing needs re-entering.' },
  { icon: 'layout', title: 'Unified Role Dashboards', text: 'One platform, three purpose-built experiences — for the Organization, the Manager, and every Employee or Student.' },
  { icon: 'barChart', title: 'Real-Time Analytics', text: 'Track attendance trends, late-comer patterns, and status breakdowns with live charts — export reports in one click.' },
  { icon: 'smartphone', title: 'Device-Locked Check-In', text: 'Each member is tied to a registered device. Device change requests route through a manager review queue.' },
];

const STEPS: Step[] = [
  {
    title: 'Create Your Workspace', text: 'Sign up and instantly receive unique join codes — no complex setup or manual data entry.',
    visual: `<div class="sv-frame-bar"><span class="sv-dot r"></span><span class="sv-dot y"></span><span class="sv-dot g"></span></div>
      <div class="sv-frame-body sv-workspace">
        <span class="sv-label">Your join code</span>
        <span class="sv-code">XJ4K-9P2Q</span>
        <span class="sv-btn">Create Workspace</span>
      </div>`,
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
      </div>`,
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
      </div>`,
  },
  {
    title: 'Automated Management', text: 'Leave requests and shift rosters sync automatically the moment an admin approves them.',
    visual: `<div class="sv-frame-bar"><span class="sv-dot r"></span><span class="sv-dot y"></span><span class="sv-dot g"></span></div>
      <div class="sv-frame-body sv-auto">
        <div class="sv-row"><span>Priya Sharma — Leave request</span><span class="sv-status">Approved</span></div>
        <div class="sv-row"><span>Weekly roster</span><span class="sv-status">Synced</span></div>
        <div class="sv-row"><span>Attendance record</span><span class="sv-status">Updated</span></div>
      </div>`,
  },
];

const ROLES: Role[] = [
  { cls: 'role-org', icon: 'barChart', title: 'Organization', text: "Bird's-eye view across all branches — compliance metrics, location maps, and department-level insight." },
  { cls: 'role-mgr', icon: 'usersGroup', title: 'Manager', text: 'Manage employees, configure geofences and BSSID zones, review alerts, and generate attendance reports.' },
];

interface ParticleOpts {
  density?: number; max?: number; min?: number; linkDist?: number; mouseDist?: number;
  dotColor?: string; lineColor?: (o: number) => string; mouseLineColor?: (o: number) => string;
}

function initParticleNetwork(container: HTMLElement | null, canvas: HTMLCanvasElement | null, opts: ParticleOpts) {
  if (!container || !canvas || !canvas.getContext) return () => {};
  const ctx = canvas.getContext('2d')!;
  let w = 0, h = 0;
  const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
  const mouse: { x: number | null; y: number | null } = { x: null, y: null };
  const density = opts.density || 16000;
  const maxCount = opts.max || 60;
  const minCount = opts.min || 18;
  const linkDist = opts.linkDist || 105;
  const mouseDist = opts.mouseDist || 130;
  const dotColor = opts.dotColor || 'rgba(109,63,214,0.55)';
  const lineColor = opts.lineColor || ((o: number) => `rgba(109,63,214,${o})`);
  const mouseLineColor = opts.mouseLineColor || ((o: number) => `rgba(34,211,201,${o})`);

  function resize() {
    w = canvas!.width = container!.offsetWidth;
    h = canvas!.height = container!.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const count = Math.max(minCount, Math.min(maxCount, Math.floor((w * h) / density)));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.4 + 1,
    });
  }

  function onMouseMove(e: MouseEvent) {
    const rect = container!.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }
  function onMouseLeave() { mouse.x = null; mouse.y = null; }
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('mouseleave', onMouseLeave);

  let raf = 0;
  let stopped = false;
  function tick() {
    if (stopped) return;
    ctx.clearRect(0, 0, w, h);
    particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      if (mouse.x !== null) {
        const dx = p.x - mouse.x, dy = p.y - (mouse.y as number);
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
        const dx = particles[i].x - mouse.x, dy = particles[i].y - (mouse.y as number);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseDist) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y as number);
          ctx.strokeStyle = mouseLineColor(0.45 * (1 - dist / mouseDist));
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(tick);
  }
  tick();

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    container.removeEventListener('mousemove', onMouseMove);
    container.removeEventListener('mouseleave', onMouseLeave);
  };
}

function initDecorativeMap(id: string, zoom: number) {
  const el = document.getElementById(id);
  const L = (window as any).L;
  if (!el || !L || (el as any)._leaflet_id) return;
  const map = L.map(id, {
    center: [30.7413, 76.7684],
    zoom,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    attributionControl: true,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 200);
}

export default function IndexPage() {
  const heroRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const ctaCanvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initDecorativeMap('heroMap', 15);
    initDecorativeMap('capMiniMap', 14);

    const revealEls = document.querySelectorAll('.reveal');
    let revealObserver: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver!.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      revealEls.forEach((el) => revealObserver!.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('in-view'));
    }

    let barObserver: IntersectionObserver | undefined;
    if (barsRef.current && 'IntersectionObserver' in window) {
      barObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            barsRef.current?.classList.add('in-view');
            barObserver!.disconnect();
          }
        });
      }, { threshold: 0.4 });
      barObserver.observe(barsRef.current);
    } else if (barsRef.current) {
      barsRef.current.classList.add('in-view');
    }

    const cleanupHeroNet = initParticleNetwork(heroRef.current, heroCanvasRef.current, { density: 15000, max: 65, min: 24 });
    const cleanupCtaNet = initParticleNetwork(ctaRef.current, ctaCanvasRef.current, {
      density: 20000, max: 36, min: 14, linkDist: 90, mouseDist: 110,
      dotColor: 'rgba(196,181,253,0.7)',
      lineColor: (o) => `rgba(196,181,253,${o})`,
      mouseLineColor: (o) => `rgba(94,234,212,${o})`,
    });

    const navbar = document.querySelector('.mkt-navbar');
    let toggleNavShadow: (() => void) | undefined;
    if (navbar) {
      toggleNavShadow = () => navbar.classList.toggle('scrolled', window.scrollY > 8);
      toggleNavShadow();
      window.addEventListener('scroll', toggleNavShadow, { passive: true });
    }

    return () => {
      revealObserver?.disconnect();
      barObserver?.disconnect();
      cleanupHeroNet();
      cleanupCtaNet();
      if (navbar && toggleNavShadow) window.removeEventListener('scroll', toggleNavShadow);
    };
  }, []);

  return (
    <>
      <nav className="mkt-navbar">
        <div className="mkt-nav-inner">
          <div className="mkt-logo">
            <span className="mark"><img src="/images/presenza-logo.svg" alt="Presenza" className="ps-logo" /></span>
            <span className="name">Presenza</span>
          </div>
          <div className="mkt-nav-links">
            <a href="#home" className="active">Home</a>
            <a href="#features">Features</a>
            <div className="mkt-nav-dropdown">
              <a href="#how" className="mkt-nav-dropdown-trigger">
                Solutions
                <svg className="chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </a>
              <div className="mkt-dropdown-panel">
                <div className="mkt-dropdown-col">
                  <span className="mkt-dropdown-heading">By Industry</span>
                  <a href="#how">Education</a>
                  <a href="#how">Corporate &amp; Offices</a>
                  <a href="#how">Healthcare</a>
                  <a href="#how">Manufacturing</a>
                  <a href="#how">Retail &amp; Field Teams</a>
                </div>
                <div className="mkt-dropdown-col">
                  <span className="mkt-dropdown-heading">By Size</span>
                  <a href="#how">Small Teams</a>
                  <a href="#how">Growing Business</a>
                  <a href="#how">Enterprise</a>
                </div>
              </div>
            </div>
            <Link to="/pricing">Pricing</Link>
            <a href="#about">About</a>
          </div>
          <div className="mkt-nav-actions">
            <Link to="/login" className="mkt-nav-login">Log in</Link>
            <Link to="/login" className="ps-btn ps-btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <header className="mkt-hero" id="home" ref={heroRef}>
        <canvas id="heroNetCanvas" className="mkt-net-canvas" ref={heroCanvasRef} />
        <div className="mkt-hero-inner">
          <div className="mkt-hero-copy">
            <span className="mkt-eyebrow">GPS + WIFI ATTENDANCE</span>
            <h1>GPS and WiFi attendance for your <span className="accent">entire workforce</span></h1>
            <p>Presenza makes it easy to track attendance for on-site and field teams. Define a geofence, register your WiFi, and every check-in is verified automatically — no manual reconciliation.</p>
            <div className="mkt-hero-actions">
              <Link to="/login" className="ps-btn ps-btn-primary">Get Started</Link>
              <a href="#how" className="mkt-link-cta">See how it works →</a>
            </div>
            <div className="mkt-hero-stats">
              <div><b>500+</b><span>Organizations</span></div>
              <div><b>2M+</b><span>Check-ins verified</span></div>
              <div><b>99.9%</b><span>Uptime</span></div>
            </div>
          </div>

          <div className="mkt-hero-visual">
            <div className="hero-illustration">
              <div id="heroMap" className="hero-illustration-map" />
              <div className="hero-illustration-tint" />
              <div className="hero-phone-frame" />
              <div className="hero-search-bar">
                <span>Room 101, Main Campus</span>
                <span className="btn">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                </span>
              </div>
              <div className="hero-geofence-circle">
                <span className="hero-geofence-pin" />
                <span className="hero-geofence-label">Room 101</span>
              </div>
              <div className="hero-agents-card">
                <div className="hero-agent"><span className="hero-agent-avatar">RS</span><span>Rahul</span></div>
                <div className="hero-agent"><span className="hero-agent-avatar t2">PS</span><span>Priya</span></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mkt-section" id="why">
        <div className="mkt-section-head reveal">
          <span className="mkt-eyebrow">WHY GPS-BASED ATTENDANCE?</span>
          <h2>Built for teams that work beyond a desk</h2>
        </div>
        <div className="mkt-why-grid">
          <div className="mkt-why-item reveal">
            <span className="mkt-check">✓</span>
            <p>For organizations that need to verify where their people actually are.</p>
          </div>
          <div className="mkt-why-item reveal">
            <span className="mkt-check">✓</span>
            <p>Ensures correct working hours for remote and field-based teams.</p>
          </div>
          <div className="mkt-why-item reveal">
            <span className="mkt-check">✓</span>
            <p>Clean, exportable data that plugs straight into payroll.</p>
          </div>
        </div>
      </section>

      <section className="mkt-capabilities">
        <div className="mkt-capabilities-inner">
          <div className="mkt-capability-row reveal">
            <div className="mkt-capability-copy">
              <span className="mkt-eyebrow">GEOFENCING</span>
              <h3>Geofenced check-ins, zero guesswork</h3>
              <p>Draw a boundary around any office, campus, or client site. The moment someone steps inside, Presenza knows — and the moment they leave, it knows that too.</p>
              <ul className="mkt-capability-list">
                <li><span className="mkt-check">✓</span> Custom radius per zone, down to the meter</li>
                <li><span className="mkt-check">✓</span> Works across unlimited branches and campuses</li>
                <li><span className="mkt-check">✓</span> Live map view for every zone you configure</li>
              </ul>
            </div>
            <div className="mkt-capability-visual mini-map">
              <div id="capMiniMap" className="mini-map-img" />
              <div className="mini-map-tint" />
              <div className="mini-map-pin"><span className="mini-map-ring" /><span className="mini-map-dot" /></div>
            </div>
          </div>

          <div className="mkt-capability-row reveal reverse">
            <div className="mkt-capability-copy">
              <span className="mkt-eyebrow">WIFI BSSID</span>
              <h3>A second layer that GPS alone can't fake</h3>
              <p>GPS can be spoofed. Presenza cross-checks every check-in against the registered WiFi router's BSSID on-site, so a check-in only counts when the device is genuinely on the workplace network.</p>
              <ul className="mkt-capability-list">
                <li><span className="mkt-check">✓</span> Register unlimited routers per zone</li>
                <li><span className="mkt-check">✓</span> Blocks proxy and location-spoofed check-ins</li>
                <li><span className="mkt-check">✓</span> Instant device-change request workflow</li>
              </ul>
            </div>
            <div className="mkt-capability-visual wifi-card-visual">
              <div className="wifi-card">
                <div className="wifi-card-top">
                  <div className="wifi-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2 8.5a16 16 0 0 1 20 0" /><path d="M5.5 12.2a11 11 0 0 1 13 0" /><path d="M9 15.9a6 6 0 0 1 6 0" /><circle cx="12" cy="19.2" r="1.1" fill="currentColor" stroke="none" /></svg>
                  </div>
                  <div>
                    <div className="wifi-card-ssid">Campus 5G</div>
                    <div className="wifi-card-bssid">A1:B2:C3:D4:E5:F6</div>
                  </div>
                  <span className="wifi-card-chip">Matched</span>
                </div>
                <div className="wifi-card-row"><span>Zone</span><b>Room 101</b></div>
                <div className="wifi-card-row"><span>Registered by</span><b>Priya Sharma</b></div>
                <div className="wifi-card-row"><span>Status</span><b className="ok">Active</b></div>
              </div>
            </div>
          </div>

          <div className="mkt-capability-row reveal">
            <div className="mkt-capability-copy">
              <span className="mkt-eyebrow">LIVE INSIGHTS</span>
              <h3>Real-time visibility for every manager</h3>
              <p>Watch attendance trends, late-arrival patterns, and status breakdowns update live. Every check-in on the ground reflects instantly on the dashboard.</p>
              <ul className="mkt-capability-list">
                <li><span className="mkt-check">✓</span> Live attendance %, streaks, and trends</li>
                <li><span className="mkt-check">✓</span> One-click exports for payroll and audits</li>
                <li><span className="mkt-check">✓</span> Role-based views for org, manager, employee</li>
              </ul>
            </div>
            <div className="mkt-capability-visual analytics-card-visual">
              <div className="analytics-card">
                <div className="analytics-card-top">
                  <span>Weekly attendance</span>
                  <span className="analytics-card-chip">Live</span>
                </div>
                <div className="analytics-bars" id="analyticsBars" ref={barsRef}>
                  <span style={{ ['--h' as any]: '62%' }} />
                  <span style={{ ['--h' as any]: '78%' }} />
                  <span style={{ ['--h' as any]: '55%' }} />
                  <span style={{ ['--h' as any]: '88%' }} />
                  <span style={{ ['--h' as any]: '70%' }} />
                  <span style={{ ['--h' as any]: '93%' }} />
                  <span style={{ ['--h' as any]: '66%' }} />
                </div>
                <div className="analytics-labels"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section" id="features">
        <div className="mkt-section-head reveal">
          <span className="mkt-eyebrow">FEATURES</span>
          <h2>Everything you need, nothing you don't</h2>
          <p>Every layer of Presenza is designed to remove doubt from attendance management.</p>
        </div>
        <div className="mkt-feature-grid" id="featureGrid">
          {FEATURES.map((f) => (
            <div className="mkt-feature-card reveal" key={f.title}>
              <div className="mkt-feature-icon"><Icon name={f.icon} size={20} /></div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section" id="how">
        <div className="mkt-section-head reveal">
          <span className="mkt-eyebrow">PROCESS</span>
          <h2>How it works</h2>
          <p>From sign-up to check-in in four simple steps.</p>
        </div>
        <div className="mkt-steps-zigzag" id="stepsGrid">
          {STEPS.map((s, i) => (
            <div className={`mkt-step-row reveal${i % 2 ? ' reverse' : ''}`} key={s.title}>
              <div className="mkt-step-copy">
                <span className="mkt-step-num">STEP 0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
              <div className="mkt-step-visual-wrap">
                <div className="sv-frame" dangerouslySetInnerHTML={{ __html: s.visual }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section" id="roles">
        <div className="mkt-section-head reveal">
          <span className="mkt-eyebrow">BUILT FOR ADMINS</span>
          <h2>A dashboard built for those who run the show</h2>
          <p>Organization admins and managers get exactly the tools they need — employees simply check in.</p>
        </div>
        <div className="mkt-roles-grid" id="rolesGrid">
          {ROLES.map((r) => (
            <div className={`mkt-role-card reveal ${r.cls}`} key={r.title}>
              <div className="mkt-role-icon"><Icon name={r.icon} size={21} /></div>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-cta-banner reveal" ref={ctaRef}>
        <canvas id="ctaNetCanvas" className="mkt-net-canvas" ref={ctaCanvasRef} />
        <div className="mkt-cta-content">
          <h2>Experience technology that empowers your workforce</h2>
          <p>Set up geofences, register WiFi zones, and get your entire team checked in accurately — in minutes, not weeks.</p>
          <Link to="/login" className="ps-btn ps-btn-primary">Get Started</Link>
        </div>
      </section>

      <footer className="mkt-footer" id="about">
        <div className="mkt-footer-inner">
          <div className="mkt-footer-brand">
            <div className="mkt-logo"><span className="mark"><img src="/images/presenza-logo.svg" alt="Presenza" className="ps-logo" /></span><span className="name">Presenza</span></div>
            <p>GPS + WiFi dual-verification attendance, built for organizations that need certainty.</p>
          </div>
          <div className="mkt-footer-col">
            <h4>Product</h4>
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#how">Solutions</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Login</Link>
          </div>
          <div className="mkt-footer-col">
            <h4>Company</h4>
            <a href="#about">About</a>
            <a href="#">Contact</a>
            <a href="#">Careers</a>
          </div>
          <div className="mkt-footer-col">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <div className="mkt-footer-bottom">© 2026 Presenza. All rights reserved.</div>
      </footer>
    </>
  );
}
