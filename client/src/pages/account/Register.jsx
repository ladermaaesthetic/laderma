import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import IntroHero from '../../components/IntroHero';
import { useAuth } from '../../context/AuthContext';
import '../Booking.css';
import './Auth.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(form);
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <IntroHero
        badge="My account"
        eyebrow="Create an account"
        title="Track your appointments with La Derma."
        lede="Create an account to see your upcoming and past appointments, and to book faster next time."
      />

      <section style={{ paddingTop: 0 }}>
        <div className="container auth-wrap">
          <div className="auth-card">
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  type="text"
                  id="name"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={handleChange('name')}
                />
              </div>

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
                <label htmlFor="phone">Phone number</label>
                <input
                  type="tel"
                  id="phone"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange('password')}
                />
                <p className="auth-hint">At least 8 characters.</p>
              </div>

              {error && (
                <ul className="form-errors">
                  <li>{error}</li>
                </ul>
              )}

              <button type="submit" className="btn btn-gold btn-gold-lg auth-submit" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create Account'}
              </button>
              <p className="auth-hint" style={{ textAlign: 'center', marginTop: 12 }}>
                By creating an account, you agree to our <NavLink to="/terms-of-service">Terms of Service</NavLink>{' '}
                and <NavLink to="/privacy-policy">Privacy Policy</NavLink>.
              </p>
            </form>

            <p className="auth-switch">
              Already have an account? <NavLink to="/account/login">Sign in</NavLink>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
