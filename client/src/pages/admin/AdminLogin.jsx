import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './admin.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setSubmitting(false);
        return;
      }

      navigate('/admin/dashboard');
    } catch {
      setError('Could not reach the server. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-shell admin-login-shell">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <p className="admin-eyebrow">La Derma</p>
        <h1 className="admin-login-title">Staff login</h1>
        <p className="admin-login-desc">Sign in to view and manage bookings.</p>

        <div className="admin-field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="admin-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="admin-error">{error}</p>}

        <button type="submit" className="btn btn-gold btn-gold-lg admin-login-btn" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
