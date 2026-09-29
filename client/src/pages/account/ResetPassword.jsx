import { useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import IntroHero from '../../components/IntroHero';
import { useAuth } from '../../context/AuthContext';
import { useSeo } from '../../hooks/useSeo';
import '../Booking.css';
import './Auth.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function ResetPassword() {
  useSeo({ title: 'Reset Password', path: '/account/reset-password', noindex: true });

  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/account/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reset your password.');

      // The server just signed us in as part of the reset — refresh the
      // shared auth state so the rest of the app (header, account page)
      // picks it up immediately.
      await refresh();
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not reset your password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <>
        <IntroHero badge="My account" eyebrow="Reset password" title="Reset your password." lede="" />
        <section style={{ paddingTop: 0 }}>
          <div className="container auth-wrap">
            <div className="auth-card">
              <div className="notice notice-error">
                <strong>This link is missing its reset token.</strong>
                <p>Please use the link from your password reset email, or request a new one.</p>
              </div>
              <p className="auth-switch">
                <NavLink to="/account/forgot-password">Request a new reset link</NavLink>
              </p>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <IntroHero
        badge="My account"
        eyebrow="Reset password"
        title="Choose a new password."
        lede="Enter a new password for your account below."
      />

      <section style={{ paddingTop: 0 }}>
        <div className="container auth-wrap">
          <div className="auth-card">
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="password">New password</label>
                <input
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="auth-hint">At least 8 characters.</p>
              </div>

              <div className="field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && (
                <ul className="form-errors">
                  <li>{error}</li>
                </ul>
              )}

              <button type="submit" className="btn btn-gold btn-gold-lg auth-submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Set New Password'}
              </button>
            </form>

            <p className="auth-switch">
              <NavLink to="/account/login">Back to sign in</NavLink>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
