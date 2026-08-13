import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

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

type CompareVal = string | boolean;
interface CompareRow { feature: string; free: CompareVal; standard: CompareVal; enterprise: CompareVal }

const COMPARE_ROWS: CompareRow[] = [
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
  { feature: 'Support', free: 'Email', standard: 'Priority email', enterprise: '24/7 priority' },
];

const FAQS = [
  { q: 'Is the Free plan really free forever?', a: 'Yes. The Free plan never expires and covers teams of up to 25 members with core geofencing and WiFi verification — no credit card required.' },
  { q: 'Can I switch plans later?', a: 'Absolutely. Upgrade or downgrade anytime from Organisation Setup in your dashboard — changes apply immediately and billing is prorated.' },
  { q: 'What counts as a "member"?', a: 'Any user who logs attendance — employees, students, or field staff. Organization admins and managers are not counted toward your member limit.' },
  { q: 'Do you offer a discount for annual billing?', a: 'Yes, switching to yearly billing saves you more than 20% compared to paying monthly, on the Standard plan.' },
  { q: 'How does Enterprise pricing work?', a: "Enterprise pricing is based on member count, number of branches, and any custom integrations you need. Reach out and we'll put together a quote within one business day." },
  { q: "Is my organization's data secure?", a: "All data is encrypted in transit and at rest. Geofence and WiFi BSSID data never leaves your organization's workspace." },
];

function CompareCell({ val, extraClass }: { val: CompareVal; extraClass?: string }) {
  if (val === true) return <td className={['yes', extraClass].filter(Boolean).join(' ')}>✓</td>;
  if (val === false) return <td className={['no', extraClass].filter(Boolean).join(' ')}>—</td>;
  return <td className={extraClass}>{val}</td>;
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const ctaCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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

    const cleanupCtaNet = initParticleNetwork(ctaRef.current, ctaCanvasRef.current, {
      density: 20000, max: 36, min: 14, linkDist: 90, mouseDist: 110,
      dotColor: 'rgba(196,181,253,0.7)',
      lineColor: (o) => `rgba(196,181,253,${o})`,
      mouseLineColor: (o) => `rgba(94,234,212,${o})`,
    });

    return () => {
      revealObserver?.disconnect();
      cleanupCtaNet();
    };
  }, []);

  return (
    <>
      <nav className="mkt-navbar">
        <div className="mkt-nav-inner">
          <Link to="/" className="mkt-logo">
            <span className="mark"><img src="/images/presenza-logo.svg" alt="Presenza" className="ps-logo" /></span>
            <span className="name">Presenza</span>
          </Link>
          <div className="mkt-nav-links">
            <Link to="/">Home</Link>
            <Link to="/#features">Features</Link>
            <div className="mkt-nav-dropdown">
              <Link to="/#how" className="mkt-nav-dropdown-trigger">
                Solutions
                <svg className="chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </Link>
              <div className="mkt-dropdown-panel">
                <div className="mkt-dropdown-col">
                  <span className="mkt-dropdown-heading">By Industry</span>
                  <Link to="/#how">Education</Link>
                  <Link to="/#how">Corporate &amp; Offices</Link>
                  <Link to="/#how">Healthcare</Link>
                  <Link to="/#how">Manufacturing</Link>
                  <Link to="/#how">Retail &amp; Field Teams</Link>
                </div>
                <div className="mkt-dropdown-col">
                  <span className="mkt-dropdown-heading">By Size</span>
                  <Link to="/#how">Small Teams</Link>
                  <Link to="/#how">Growing Business</Link>
                  <Link to="/#how">Enterprise</Link>
                </div>
              </div>
            </div>
            <Link to="/pricing" className="active">Pricing</Link>
            <Link to="/#about">About</Link>
          </div>
          <div className="mkt-nav-actions">
            <Link to="/login" className="mkt-nav-login">Log in</Link>
            <Link to="/login" className="ps-btn ps-btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <header className="pricing-hero">
        <span className="mkt-eyebrow">PRICING</span>
        <h1>Simple, transparent pricing<br />for every team size</h1>
        <p>Start free. Upgrade the moment you need more zones, more members, or deeper insight — no surprises, no forced contracts.</p>

        <div className="pricing-toggle" id="pricingToggle">
          <span className={`pt-label${!yearly ? ' active' : ''}`} data-mode="monthly">Monthly</span>
          <button className={`pt-switch${yearly ? ' on' : ''}`} id="ptSwitch" aria-label="Toggle yearly billing" onClick={() => setYearly((y) => !y)}>
            <span className="pt-knob" />
          </button>
          <span className={`pt-label${yearly ? ' active' : ''}`} data-mode="yearly">Yearly</span>
          <span className="pt-save">Save 20%</span>
        </div>
      </header>

      <section className="pricing-plans">
        <div className="pricing-card reveal">
          <div className="pc-top">
            <span className="pc-name">Free</span>
            <p className="pc-desc">For small teams just getting started.</p>
          </div>
          <div className="pc-price">
            <span className="pc-amount">₹0</span>
            <span className="pc-period">forever</span>
          </div>
          <Link to="/login" className="ps-btn ps-btn-ghost pc-cta">Get Started</Link>
          <ul className="pc-features">
            <li><span className="pc-check">✓</span> Up to 25 members</li>
            <li><span className="pc-check">✓</span> 1 geofence zone</li>
            <li><span className="pc-check">✓</span> Basic WiFi BSSID check</li>
            <li><span className="pc-check">✓</span> Attendance history</li>
            <li><span className="pc-check">✓</span> Email support</li>
          </ul>
        </div>

        <div className="pricing-card featured reveal">
          <span className="pc-badge">Most Popular</span>
          <div className="pc-top">
            <span className="pc-name">Standard</span>
            <p className="pc-desc">For growing organizations that need real control.</p>
          </div>
          <div className="pc-price">
            <span className="pc-amount">{yearly ? '₹79' : '₹99'}</span>
            <span className="pc-period">/ user / month</span>
          </div>
          <Link to="/login" className="ps-btn ps-btn-primary pc-cta">Get Started</Link>
          <ul className="pc-features">
            <li><span className="pc-check">✓</span> Up to 200 members</li>
            <li><span className="pc-check">✓</span> Unlimited geofence zones</li>
            <li><span className="pc-check">✓</span> GPS + WiFi dual verification</li>
            <li><span className="pc-check">✓</span> Real-time analytics dashboard</li>
            <li><span className="pc-check">✓</span> Leave &amp; roster automation</li>
            <li><span className="pc-check">✓</span> Priority email support</li>
          </ul>
        </div>

        <div className="pricing-card reveal">
          <div className="pc-top">
            <span className="pc-name">Enterprise</span>
            <p className="pc-desc">For large, multi-branch deployments.</p>
          </div>
          <div className="pc-price">
            <span className="pc-amount pc-amount-custom">Custom</span>
            <span className="pc-period">talk to sales</span>
          </div>
          <a href="#faq" className="ps-btn ps-btn-ghost pc-cta">Contact Sales</a>
          <ul className="pc-features">
            <li><span className="pc-check">✓</span> Up to 1000+ members</li>
            <li><span className="pc-check">✓</span> Multi-branch geofencing</li>
            <li><span className="pc-check">✓</span> Custom integrations &amp; SSO</li>
            <li><span className="pc-check">✓</span> Dedicated onboarding</li>
            <li><span className="pc-check">✓</span> SLA-backed uptime</li>
            <li><span className="pc-check">✓</span> 24/7 priority support</li>
          </ul>
        </div>
      </section>

      <p className="pricing-quote-note reveal">Have more than 1,000 members? <a href="#faq">Ask for a price quote →</a></p>

      <section className="pricing-compare" id="compare">
        <div className="mkt-section-head reveal">
          <span className="mkt-eyebrow">COMPARE</span>
          <h2>Every plan, side by side</h2>
          <p>A closer look at what's included at each tier.</p>
        </div>

        <div className="compare-table-wrap reveal">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="ct-feature-col">Feature</th>
                <th>Free</th>
                <th className="ct-featured-col">Standard</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody id="compareBody">
              {COMPARE_ROWS.map((r) => (
                <tr key={r.feature}>
                  <td className="ct-feature-col">{r.feature}</td>
                  <CompareCell val={r.free} />
                  <CompareCell val={r.standard} extraClass="ct-featured-col" />
                  <CompareCell val={r.enterprise} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mkt-section pricing-faq" id="faq">
        <div className="mkt-section-head reveal">
          <span className="mkt-eyebrow">FAQ</span>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="faq-list reveal" id="faqList">
          {FAQS.map((f, i) => (
            <div className={`faq-item${openFaq === i ? ' open' : ''}`} data-index={i} key={f.q}>
              <div className="faq-q" onClick={() => setOpenFaq((cur) => (cur === i ? null : i))}>
                <span>{f.q}</span><span className="faq-plus">+</span>
              </div>
              <div className="faq-a" style={{ maxHeight: openFaq === i ? '400px' : undefined }}>
                <p>{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-cta-banner reveal" ref={ctaRef}>
        <canvas id="ctaNetCanvas" className="mkt-net-canvas" ref={ctaCanvasRef} />
        <div className="mkt-cta-content">
          <h2>Ready to make attendance fraud impossible?</h2>
          <p>Start on the Free plan today — upgrade whenever your team is ready.</p>
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
            <Link to="/">Home</Link>
            <Link to="/#features">Features</Link>
            <Link to="/#how">Solutions</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Login</Link>
          </div>
          <div className="mkt-footer-col">
            <h4>Company</h4>
            <Link to="/#about">About</Link>
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
