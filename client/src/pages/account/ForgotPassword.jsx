import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import IntroHero from '../../components/IntroHero';
import '../Booking.css';
import './Auth.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/account/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // The server always responds the same way whether or not the email
      // matches an account, so this only reflects real connectivity
      // failures — never "no account with that email".
      if (!res.ok) throw new Error('Could not reach the server.');
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <IntroHero
        badge="My account"
        eyebrow="Forgot password"
        title="Reset your password."
        lede="Enter the email address on your account and we'll send you a link to choose a new password."
      />

      <section style={{ paddingTop: 0 }}>
        <div className="container auth-wrap">
          <div className="auth-card">
            {sent ? (
              <div className="notice notice-success">
                <strong>Check your email.</strong>
                <p>If an account exists for {email}, a password reset link is on its way. It expires in 1 hour.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <input
                    type="email"
                    id="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {error && (
                  <ul className="form-errors">
                    <li>{error}</li>
                  </ul>
                )}

                <button type="submit" className="btn btn-gold btn-gold-lg auth-submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}

            <p className="auth-switch">
              <NavLink to="/account/login">Back to sign in</NavLink>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
