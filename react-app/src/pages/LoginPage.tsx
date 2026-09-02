import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { AppStore } from '../lib/appStore';
import { useSession } from '../lib/SessionContext';

type FpStep = 'closed' | 'email' | 'reset';

export default function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [fpStep, setFpStep] = useState<FpStep>('closed');
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState(false);
  const [fpBusy, setFpBusy] = useState(false);

  function isValidEmailOrId(value: string) {
    if (!value) return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value) || value.trim().length >= 3;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();

    if (!isValidEmailOrId(trimmedEmail)) { setError('Enter a valid UserId or Email Address.'); return; }
    if (!password || password.length < 4) { setError('Password must be at least 4 characters.'); return; }

    setSubmitting(true);
    try {
      const session = await login(trimmedEmail, password);
      if (session.role === 'employee') navigate('/employee');
      else navigate('/organization');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  }

  function openForgotModal() {
    setFpEmail(email.trim());
    setFpOtp('');
    setFpNewPass('');
    setFpError('');
    setFpSuccess(false);
    setFpStep('email');
  }
  function closeForgotModal() { setFpStep('closed'); }

  async function sendCode() {
    setFpError('');
    if (!fpEmail) { setFpError('Enter your email address.'); return; }
    setFpBusy(true);
    try {
      await AppStore.forgotPassword(fpEmail);
      setFpStep('reset');
    } catch (err: any) {
      setFpError(err?.message || 'Could not send the code. Try again.');
    } finally {
      setFpBusy(false);
    }
  }

  async function resendCode() {
    setFpBusy(true);
    try {
      await AppStore.forgotPassword(fpEmail);
      setFpError('');
    } catch (err: any) {
      setFpError(err?.message || 'Could not resend the code.');
    } finally {
      setFpBusy(false);
    }
  }

  async function resetPassword() {
    setFpError('');
    if (!fpOtp.trim()) { setFpError('Enter the code we emailed you.'); return; }
    if (!fpNewPass || fpNewPass.length < 8) { setFpError('New password must be at least 8 characters.'); return; }
    setFpBusy(true);
    try {
      await AppStore.verifyPasswordResetOtp(fpEmail, fpOtp.trim());
      await AppStore.resetPassword(fpEmail, fpNewPass);
      setFpSuccess(true);
    } catch (err: any) {
      setFpError(err?.message || 'Could not reset the password. Check the code and try again.');
    } finally {
      setFpBusy(false);
    }
  }

  function backToLoginAfterReset() {
    closeForgotModal();
    setPassword('');
  }

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <span className="login-blob b1" />
        <span className="login-blob b2" />

        <div className="login-content">
          <Link to="/" className="login-logo">
            <span className="mark"><img src="/images/presenza-logo.svg" alt="Presenza" className="ps-logo" /></span>
            <span className="name">Presenza</span>
          </Link>

          <h1 className="login-heading">Check in to the<br /><span className="accent-text">future of work.</span></h1>
          <p className="login-copy">GPS + WiFi dual verification means nobody ever wonders who was really there.</p>

          <div className="login-badges">
            <div className="login-badge"><Icon name="shield" size={15} /><span>Spoof-proof</span></div>
            <div className="login-badge"><Icon name="zap" size={15} /><span>Instant check-in</span></div>
            <div className="login-badge"><Icon name="layout" size={15} /><span>Role-based access</span></div>
          </div>
        </div>

        <div className="login-phone">
          <div className="login-phone-frame">
            <span className="login-phone-notch" />
            <div className="login-phone-screen">
              <div className="lp-topbar">
                <span className="lp-avatar" />
                <span className="lp-search">Search your colleague</span>
              </div>
              <div className="lp-greet">Good Morning,<br />Alex</div>
              <div className="lp-shift-card">
                <span className="lp-shift-label">SHIFT TODAY · GENERAL</span>
                <span className="lp-shift-time">9:00 AM – 6:00 PM</span>
                <span className="lp-checkin-btn">Check In</span>
              </div>
              <div className="lp-badges">
                <span className="lp-mini-badge">GPS ✓</span>
                <span className="lp-mini-badge">WiFi ✓</span>
              </div>
              <div className="lp-grid">
                <span /><span /><span />
                <span /><span /><span />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Log into Presenza</h2>
          <p className="login-form-sub">Enter your details to access your dashboard</p>

          {error ? <div className="ps-alert ps-alert-error visible">{error}</div> : <div className="ps-alert ps-alert-error" />}

          <div className="ps-field">
            <label>UserId or Email Address</label>
            <input type="text" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="ps-field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button
            type="submit"
            className="ps-btn ps-btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 14.5 }}
            disabled={submitting}
          >
            {submitting ? 'Logging in…' : 'Log In'}
          </button>
          <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); openForgotModal(); }}>Forgot password?</a>

      {fpStep !== 'closed' && (
        <div className="ps-modal-overlay open">
          <div className="ps-modal" role="dialog" aria-modal="true">
            <div className="ps-modal-header">
              <div>
                <div className="ps-modal-title">{fpStep === 'email' ? 'Reset your password' : 'Enter the code'}</div>
                <div className="ps-modal-subtitle">
                  {fpStep === 'email' ? "We'll email you a one-time code." : 'Sent to ' + fpEmail + ' — check your inbox.'}
                </div>
              </div>
              <button type="button" className="ps-modal-close" aria-label="Close" onClick={closeForgotModal}>&times;</button>
            </div>
            <div className="ps-modal-body">
              {fpError ? <div className="ps-modal-error visible">{fpError}</div> : <div className="ps-modal-error" />}

              {fpStep === 'email' && (
                <>
                  <div className="ps-field">
                    <label>Email address</label>
                    <input type="email" placeholder="you@company.com" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} />
                  </div>
                  <div className="ps-modal-actions">
                    <button type="button" className="ps-btn ps-btn-ghost" onClick={closeForgotModal}>Cancel</button>
                    <button type="button" className="ps-btn ps-btn-primary" disabled={fpBusy} onClick={sendCode}>Send Code</button>
                  </div>
                </>
              )}

              {fpStep === 'reset' && !fpSuccess && (
                <>
                  <div className="ps-field">
                    <label>One-time code</label>
                    <input type="text" placeholder="6-digit code" value={fpOtp} onChange={(e) => setFpOtp(e.target.value)} />
                  </div>
                  <div className="ps-field">
                    <label>New password</label>
                    <input type="password" placeholder="At least 8 characters" value={fpNewPass} onChange={(e) => setFpNewPass(e.target.value)} />
                  </div>
                  <div className="ps-modal-actions">
                    <button type="button" className="ps-btn ps-btn-ghost" disabled={fpBusy} onClick={resendCode}>Resend code</button>
                    <button type="button" className="ps-btn ps-btn-primary" disabled={fpBusy} onClick={resetPassword}>Reset Password</button>
                  </div>
                </>
              )}

              {fpStep === 'reset' && fpSuccess && (
                <>
                  <div className="ps-modal-success" style={{ display: 'block', background: 'rgba(34,197,94,0.12)', color: '#16a34a', fontSize: 12.5, fontWeight: 600, padding: '10px 14px', borderRadius: 10, marginBottom: 14 }}>
                    Password reset — you can log in now.
                  </div>
                  <div className="ps-modal-actions">
                    <button type="button" className="ps-btn ps-btn-primary" onClick={backToLoginAfterReset}>Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
