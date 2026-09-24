import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import IntroHero from '../../components/IntroHero';
import { useAuth } from '../../context/AuthContext';
import '../Booking.css';
import './Auth.css';

export default function Login() {
  const { login, idleSignedOut, acknowledgeIdleSignOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/account';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Shows once, right after an idle sign-out lands someone here — a plain
  // "you got logged out" with no explanation reads like a bug, not a
  // security feature. acknowledgeIdleSignOut clears the underlying flag so
  // it doesn't reappear on a later, unrelated visit to this page.
  const [showIdleNotice, setShowIdleNotice] = useState(false);
  useEffect(() => {
    if (idleSignedOut) {
      setShowIdleNotice(true);
      acknowledgeIdleSignOut();
    }
  }, [idleSignedOut, acknowledgeIdleSignOut]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <IntroHero
        badge="My account"
        eyebrow="Sign in"
        title="Welcome back."
        lede="Sign in to view your upcoming appointments and booking history."
      />

      <section style={{ paddingTop: 0 }}>
        <div className="container auth-wrap">
          <div className="auth-card">
            {showIdleNotice && (
              <div className="notice notice-pending" style={{ marginBottom: 24 }}>
                <strong>You were signed out.</strong>
                <p>Your session timed out after a while of inactivity, to keep your account secure. Please sign in again.</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange('email')}
                />
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="password">Password</label>
                  <NavLink to="/account/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--gold-deep)' }}>
                    Forgot password?
                  </NavLink>
                </div>
                <input
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange('password')}
                />
              </div>

              {error && (
                <ul className="form-errors">
                  <li>{error}</li>
                </ul>
              )}

              <button type="submit" className="btn btn-gold btn-gold-lg auth-submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="auth-switch">
              Don't have an account? <NavLink to="/account/register">Create one</NavLink>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
