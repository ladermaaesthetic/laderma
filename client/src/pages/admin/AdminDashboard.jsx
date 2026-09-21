import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './admin.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const POLL_INTERVAL_MS = 12000; // ~12s — real-time-feeling without websockets

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(iso, timezone) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: timezone });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  return `${date}, ${time}`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [bookingsError, setBookingsError] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [showWalkInForm, setShowWalkInForm] = useState(false);

  // --- Auth check on mount ---
  useEffect(() => {
    fetch(`${API_BASE}/api/admin/session`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          navigate('/admin');
          return;
        }
        setUsername(data.username);
        setCheckingAuth(false);
      })
      .catch(() => navigate('/admin'));
  }, [navigate]);

  // --- Bookings polling ---
  const loadBookings = useCallback(() => {
    fetch(`${API_BASE}/api/admin/bookings`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          navigate('/admin');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.error) {
          setBookingsError(data.error);
        } else {
          setBookingsError(null);
          setBookings(data.bookings || []);
          setLastUpdated(new Date());
        }
        setLoadingBookings(false);
      })
      .catch(() => {
        setBookingsError('Could not reach the server.');
        setLoadingBookings(false);
      });
  }, [navigate]);

  useEffect(() => {
    if (checkingAuth) return;
    loadBookings();
    const interval = setInterval(loadBookings, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkingAuth, loadBookings]);

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/admin/logout`, { method: 'POST', credentials: 'include' });
    navigate('/admin');
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking? This cannot be undone.')) return;
    const res = await fetch(`${API_BASE}/api/admin/bookings/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } else {
      alert('Could not cancel the booking. Please try again.');
    }
  };

  if (checkingAuth) {
    return <div className="admin-shell"><p className="admin-loading">Checking session…</p></div>;
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">La Derma</p>
          <h1 className="admin-title">Bookings dashboard</h1>
        </div>
        <div className="admin-header-actions">
          <span className="admin-username">{username}</span>
          <button className="btn btn-outline" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <div className="admin-toolbar">
        <button className="btn btn-gold" onClick={() => setShowWalkInForm((v) => !v)}>
          {showWalkInForm ? 'Close' : '+ New Walk-in Booking'}
        </button>
        <span className="admin-updated">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-GB')}` : ''}
        </span>
      </div>

      {showWalkInForm && (
        <WalkInForm
          onCreated={() => {
            setShowWalkInForm(false);
            loadBookings();
          }}
        />
      )}

      {bookingsError && (
        <div className="admin-notice admin-notice-error">{bookingsError}</div>
      )}

      {loadingBookings && !bookingsError && (
        <p className="admin-loading">Loading bookings…</p>
      )}

      {!loadingBookings && !bookingsError && bookings.length === 0 && (
        <p className="admin-empty">No upcoming bookings.</p>
      )}

      {!loadingBookings && bookings.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Client</th>
                <th>Contact</th>
                <th>Treatment</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{formatDateTime(b.start, 'Europe/London')}</td>
                  <td>{b.clientName || '—'}</td>
                  <td>
                    <div>{b.clientEmail || '—'}</div>
                    <div className="admin-muted">{b.clientPhone || ''}</div>
                  </td>
                  <td>{b.treatment || '—'}</td>
                  <td className="admin-notes-cell">{b.notes || '—'}</td>
                  <td>
                    <button className="admin-cancel-btn" onClick={() => handleCancel(b.id)}>Cancel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WalkInForm({ onCreated }) {
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ treatment: '', name: '', email: '', phone: '', notes: '' });
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    fetch(`${API_BASE}/api/admin/availability?date=${date}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        setTreatments(data.treatments || []);
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [date]);

  const handleField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrors(['Select a time slot first.']);
      return;
    }
    setSubmitting(true);
    setErrors([]);

    const res = await fetch(`${API_BASE}/api/admin/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ startISO: selectedSlot, ...form }),
    });
    const data = await res.json();

    if (!res.ok) {
      setErrors(data.errors || [data.error || 'Something went wrong.']);
      setSubmitting(false);
      return;
    }

    onCreated();
  };

  return (
    <form className="admin-walkin-form" onSubmit={handleSubmit}>
      <h2 className="admin-walkin-title">New walk-in booking</h2>

      <div className="admin-field">
        <label htmlFor="wi-date">Date</label>
        <input id="wi-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {slotsLoading && <p className="admin-loading">Loading available times…</p>}
      {!slotsLoading && slots.length === 0 && <p className="admin-empty">No availability that day.</p>}
      {!slotsLoading && slots.length > 0 && (
        <div className="admin-slot-grid">
          {slots.map((iso) => (
            <button
              type="button"
              key={iso}
              className={`admin-slot-btn${selectedSlot === iso ? ' selected' : ''}`}
              onClick={() => setSelectedSlot(iso)}
            >
              {new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}
            </button>
          ))}
        </div>
      )}

      <div className="admin-field">
        <label htmlFor="wi-treatment">Treatment focus</label>
        <select id="wi-treatment" required value={form.treatment} onChange={handleField('treatment')}>
          <option value="" disabled>Select a treatment focus</option>
          {treatments.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="wi-name">Full name</label>
          <input id="wi-name" required value={form.name} onChange={handleField('name')} />
        </div>
        <div className="admin-field">
          <label htmlFor="wi-email">Email address</label>
          <input id="wi-email" type="email" required value={form.email} onChange={handleField('email')} />
        </div>
      </div>

      <div className="admin-field">
        <label htmlFor="wi-phone">Phone number</label>
        <input id="wi-phone" type="tel" required value={form.phone} onChange={handleField('phone')} />
      </div>

      <div className="admin-field">
        <label htmlFor="wi-notes">Notes</label>
        <textarea id="wi-notes" value={form.notes} onChange={handleField('notes')} />
      </div>

      {errors.length > 0 && (
        <ul className="admin-form-errors">
          {errors.map((err) => <li key={err}>{err}</li>)}
        </ul>
      )}

      <button type="submit" className="btn btn-gold" disabled={submitting || !selectedSlot}>
        {submitting ? 'Booking…' : 'Confirm Walk-in Booking'}
      </button>
    </form>
  );
}
