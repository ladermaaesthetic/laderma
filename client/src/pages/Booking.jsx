import { useEffect, useState } from 'react';
import IntroHero from '../components/IntroHero';
import { CLINIC_ADDRESS } from '../data/siteData';
import './Booking.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function todayISODate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatTime(iso, timezone) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
}

function formatDateLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function Booking() {
  const [status, setStatus] = useState(null); // { connected, consultationMinutes, timezone, treatments }
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ treatment: '', name: '', email: '', phone: '', notes: '' });
  const [formErrors, setFormErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  // Load public status (connected? which treatments? timezone?) once on mount.
  useEffect(() => {
    fetch(`${API_BASE}/api/status`)
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setStatusLoading(false);
      })
      .catch(() => {
        setStatusError('Could not reach the booking server.');
        setStatusLoading(false);
      });
  }, []);

  // Load availability whenever the selected date changes, once we know the
  // calendar is connected.
  useEffect(() => {
    if (!status?.connected) return;

    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedSlot(null);

    fetch(`${API_BASE}/api/availability?date=${selectedDate}`)
      .then((r) => {
        if (!r.ok) throw new Error('availability_failed');
        return r.json();
      })
      .then((data) => {
        setSlots(data.slots || []);
        setSlotsLoading(false);
      })
      .catch(() => {
        setSlotsError('Could not load availability for this day.');
        setSlotsLoading(false);
      });
  }, [selectedDate, status?.connected]);

  const handleFieldChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setFormErrors(['Please select an available time first.']);
      return;
    }

    setSubmitting(true);
    setFormErrors([]);

    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startISO: selectedSlot, ...form }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormErrors(data.errors || [data.error || 'Something went wrong.']);
        setSubmitting(false);
        // If the slot was taken by someone else, refresh the list.
        if (res.status === 409) {
          fetch(`${API_BASE}/api/availability?date=${selectedDate}`)
            .then((r) => r.json())
            .then((d) => setSlots(d.slots || []));
        }
        return;
      }

      setConfirmed(data);
      setSubmitting(false);
    } catch {
      setFormErrors(['Could not reach the booking server. Please try again.']);
      setSubmitting(false);
    }
  };

  // ---- Render states -------------------------------------------------

  if (statusLoading) {
    return (
      <>
        <BookingIntro />
        <section>
          <div className="container content-grid">
            <div>
              <div className="skeleton skeleton-eyebrow" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-datepicker" />
              <div className="skeleton-slot-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div className="skeleton skeleton-slot" key={i} />
                ))}
              </div>
            </div>
            <div className="skeleton skeleton-sidebar" />
          </div>
        </section>
      </>
    );
  }

  if (statusError) {
    return (
      <>
        <BookingIntro />
        <section>
          <div className="container">
            <div className="notice notice-error">
              <strong>Booking is temporarily unavailable.</strong>
              <p>{statusError} Please contact the clinic directly, or try again shortly.</p>
            </div>
          </div>
        </section>
        <LocationSection />
      </>
    );
  }

  if (!status.connected) {
    return (
      <>
        <BookingIntro />
        <section>
          <div className="container">
            <div className="notice notice-pending">
              <strong>Online booking isn't live yet.</strong>
              <p>The clinic hasn't connected its Google Calendar to the booking system. Please check back shortly, or contact the clinic directly to arrange your consultation.</p>
            </div>
          </div>
        </section>
        <LocationSection />
      </>
    );
  }

  if (confirmed) {
    return (
      <>
        <BookingIntro />
        <section>
          <div className="container">
            <div className="notice notice-success">
              <strong>Your consultation is confirmed.</strong>
              <p>
                {form.treatment} on {new Date(confirmed.start.dateTime).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
                at {formatTime(confirmed.start.dateTime, status.timezone)}.
              </p>
              <p>A calendar invite has been sent to {form.email}. We look forward to seeing you.</p>
            </div>
          </div>
        </section>
        <LocationSection />
      </>
    );
  }

  // ---- Main booking UI -------------------------------------------------

  return (
    <>
      <BookingIntro />

      <section>
        <div className="container content-grid">

          {/* Left: date + slot picker + form */}
          <div>
            <p className="panel-eyebrow">Consultation details</p>
            <h2 className="panel-title">Choose a time and tell us what you'd like to discuss</h2>
            <p className="panel-desc">Select an available slot below, then share a few details to confirm your consultation.</p>

            <div className="date-picker">
              <label htmlFor="date">Choose a date</label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                min={todayISODate()}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="slots-block">
              <p className="slots-date-label">{formatDateLabel(selectedDate)}</p>

              {slotsLoading && (
                <div className="skeleton-slot-grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div className="skeleton skeleton-slot" key={i} />
                  ))}
                </div>
              )}
              {slotsError && <p className="panel-desc" style={{ color: 'var(--red)' }}>{slotsError}</p>}

              {!slotsLoading && !slotsError && slots.length === 0 && (
                <div className="avail-empty">
                  <strong>No availability that day</strong>
                  Try another date — the clinic may be closed or fully booked.
                </div>
              )}

              {!slotsLoading && slots.length > 0 && (
                <div className="slot-grid">
                  {slots.map((iso) => (
                    <button
                      type="button"
                      key={iso}
                      className={`slot-btn${selectedSlot === iso ? ' selected' : ''}`}
                      onClick={() => setSelectedSlot(iso)}
                    >
                      {formatTime(iso, status.timezone)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="focus">Treatment focus</label>
                <select id="focus" required value={form.treatment} onChange={handleFieldChange('treatment')}>
                  <option value="" disabled>Select a treatment focus</option>
                  {status.treatments.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="fullName">Full name</label>
                  <input type="text" id="fullName" autoComplete="name" required value={form.name} onChange={handleFieldChange('name')} />
                </div>
                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <input type="email" id="email" autoComplete="email" required value={form.email} onChange={handleFieldChange('email')} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="phone">Phone number</label>
                <input type="tel" id="phone" autoComplete="tel" required value={form.phone} onChange={handleFieldChange('phone')} />
              </div>

              <div className="field">
                <label htmlFor="notes">Additional notes</label>
                <textarea id="notes" placeholder="Anything you'd like us to know before your consultation" value={form.notes} onChange={handleFieldChange('notes')} />
              </div>

              {formErrors.length > 0 && (
                <ul className="form-errors">
                  {formErrors.map((err) => <li key={err}>{err}</li>)}
                </ul>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-gold btn-gold-lg" disabled={submitting || !selectedSlot}>
                  {submitting ? 'Confirming…' : 'Confirm Consultation'}
                </button>
                {!selectedSlot && <span className="form-status">Select a time above first</span>}
              </div>
            </form>
          </div>

          {/* Right: summary sidebar */}
          <div className="sidebar">
            <div className="sidebar-block">
              <p className="sidebar-block-label">Your selection</p>
              {selectedSlot ? (
                <div className="summary">
                  <p className="summary-date">{formatDateLabel(selectedDate)}</p>
                  <p className="summary-time">{formatTime(selectedSlot, status.timezone)} &middot; {status.consultationMinutes} min</p>
                </div>
              ) : (
                <p className="panel-desc" style={{ marginTop: 10 }}>Pick a date and time to see your selection here.</p>
              )}
            </div>
          </div>

        </div>
      </section>

      <LocationSection />
    </>
  );
}

function BookingIntro() {
  return (
    <IntroHero
      badge="Book consultation"
      eyebrow="Book consultation"
      title="View live clinic availability and reserve a consultation time that suits you."
      lede="Choose your treatment focus, review the currently open consultation times, and confirm your booking directly — it's added straight to La Derma's calendar."
    />
  );
}

function LocationSection() {
  return (
    <section className="location-section">
      <div className="container location-grid">
        <div>
          <p className="section-eyebrow">Find us</p>
          <h2 className="section-title" style={{ maxWidth: '20rem' }}>La Derma Aesthetic Clinic</h2>
          <p className="section-desc" style={{ maxWidth: '30rem' }}>{CLINIC_ADDRESS.full}</p>
          <a
            href={CLINIC_ADDRESS.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            style={{ marginTop: 24 }}
          >
            Get Directions
          </a>
        </div>
        <div className="location-map-wrap">
          <iframe
            title="La Derma Aesthetic Clinic location"
            src={CLINIC_ADDRESS.googleMapsEmbedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}
