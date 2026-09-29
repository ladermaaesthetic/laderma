import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import IntroHero from '../../components/IntroHero';
import { useAuth } from '../../context/AuthContext';
import { useSeo } from '../../hooks/useSeo';
import '../Booking.css';
import './Account.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BookingRow({ booking, onCancel, cancelling }) {
  return (
    <div className="account-booking-row">
      <div>
        <p className="account-booking-treatment">{booking.treatment}</p>
        <p className="account-booking-date">{formatDateTime(booking.startISO)}</p>
      </div>
      {onCancel && (
        <button
          type="button"
          className="btn btn-outline account-cancel-btn"
          onClick={() => onCancel(booking.eventId)}
          disabled={cancelling === booking.eventId}
        >
          {cancelling === booking.eventId ? 'Cancelling…' : 'Cancel'}
        </button>
      )}
    </div>
  );
}

export default function Account() {
  useSeo({ title: 'My Account', path: '/account', noindex: true });

  const { client, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  // Route guard: once we know for certain there's no signed-in client,
  // bounce to login rather than showing an empty dashboard. Waits for
  // authLoading to resolve first so a signed-in client isn't briefly
  // redirected while their session is still being checked.
  useEffect(() => {
    if (!authLoading && !client) {
      navigate('/account/login', { state: { from: '/account' }, replace: true });
    }
  }, [authLoading, client, navigate]);

  const loadBookings = () => {
    fetch(`${API_BASE}/api/account/bookings`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then((data) => setBookings(data))
      .catch(() => setLoadError('Could not load your bookings right now. Please try again shortly.'));
  };

  useEffect(() => {
    if (client) loadBookings();
  }, [client]);

  const handleCancel = async (eventId) => {
    setCancelling(eventId);
    setCancelError(null);
    try {
      const res = await fetch(`${API_BASE}/api/account/bookings/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not cancel this booking.');
      loadBookings();
    } catch (err) {
      setCancelError(err.message || 'Could not cancel this booking.');
    } finally {
      setCancelling(null);
    }
  };

  if (authLoading || !client) {
    return null;
  }

  return (
    <>
      <IntroHero
        badge="My account"
        eyebrow="My account"
        title={`Welcome back, ${client.name.split(' ')[0]}.`}
        lede="Here's an overview of your upcoming and past appointments with La Derma."
      />

      <section style={{ paddingTop: 0 }}>
        <div className="container account-grid">
          <div>
            <div className="account-section">
              <p className="section-eyebrow">Upcoming appointments</p>
              {!bookings && !loadError && <p className="account-status">Loading your appointments…</p>}
              {loadError && <p className="account-status account-status-error">{loadError}</p>}
              {bookings && bookings.upcoming.length === 0 && (
                <p className="account-status">You don't have any upcoming appointments booked.</p>
              )}
              {bookings && bookings.upcoming.length > 0 && (
                <div className="account-booking-list">
                  {bookings.upcoming.map((b) => (
                    <BookingRow key={b.eventId} booking={b} onCancel={handleCancel} cancelling={cancelling} />
                  ))}
                </div>
              )}
              {cancelError && <p className="account-status account-status-error">{cancelError}</p>}
            </div>

            <div className="account-section">
              <p className="section-eyebrow">Past appointments</p>
              {bookings && bookings.past.length === 0 && (
                <p className="account-status">No past appointments yet.</p>
              )}
              {bookings && bookings.past.length > 0 && (
                <div className="account-booking-list">
                  {bookings.past.map((b) => (
                    <BookingRow key={b.eventId} booking={b} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="sidebar">
            <div className="sidebar-block">
              <p className="sidebar-block-label">Account details</p>
              <div className="account-details">
                <p>{client.name}</p>
                <p>{client.email}</p>
                {client.phone && <p>{client.phone}</p>}
              </div>
              <button type="button" className="btn btn-outline account-logout-btn" onClick={logout}>
                Sign Out
              </button>
            </div>

            <div className="sidebar-block" style={{ marginTop: 20 }}>
              <p className="sidebar-block-label">Book another visit</p>
              <p className="panel-desc" style={{ marginTop: 10 }}>Ready for your next appointment?</p>
              <NavLink to="/booking" className="btn btn-gold btn-gold-lg" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
                Book Consultation
              </NavLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
