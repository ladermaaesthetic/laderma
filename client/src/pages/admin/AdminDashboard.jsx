import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionTimeoutWarning from '../../components/SessionTimeoutWarning';
import { useIdleTimeout } from '../../hooks/useIdleTimeout';
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '../../config/sessionTimeout';
import './admin.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const POLL_INTERVAL_MS = 12000; // ~12s — real-time-feeling without websockets

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function pad2(n) { return String(n).padStart(2, '0'); }

// Formats a Date as a local YYYY-MM-DD string (not UTC — toISOString()
// shifts to UTC first, which can land on the wrong calendar day for
// anyone west of Greenwich or late in the evening).
function toLocalISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Builds the 6x7 grid of dates for a month view, padded with the trailing
// days of the previous/next month so every week row is full — a standard
// month-calendar layout.
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  // getDay(): 0=Sun..6=Sat: convert to a Monday-first index.
  const firstWeekday = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstWeekday);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

// A reusable month-view calendar: shows the full month grid, lets the
// admin (or the walk-in form) click any date, and highlights today and
// the selected date. Purely a date picker by default — it doesn't know
// about times. Two optional props extend it for the Bookings tab's
// overview: `counts` (a { 'YYYY-MM-DD': number } map) shows a small badge
// under any date with bookings, and `onMonthChange(year, month)` — month
// 1-indexed — fires whenever the visible month changes (including on
// mount), so a parent can fetch counts for whatever range is on screen.
function MonthCalendar({ selectedDate, onSelect, minDate, counts, onMonthChange }) {
  const selected = new Date(`${selectedDate}T00:00:00`);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  useEffect(() => {
    onMonthChange?.(viewYear, viewMonth + 1);
  }, [viewYear, viewMonth, onMonthChange]);

  const today = todayISODate();
  const min = minDate || null;
  const days = buildMonthGrid(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const goPrevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goNextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div className="month-cal">
      <div className="month-cal-head">
        <button type="button" className="month-cal-nav" onClick={goPrevMonth} aria-label="Previous month">
          <svg width="9" height="14" viewBox="0 0 9 14" fill="none"><path d="M8 1L2 7l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <p className="month-cal-label">{monthLabel}</p>
        <button type="button" className="month-cal-nav" onClick={goNextMonth} aria-label="Next month">
          <svg width="9" height="14" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="month-cal-weekdays">
        {WEEKDAY_LABELS.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="month-cal-grid">
        {days.map((d) => {
          const iso = toLocalISODate(d);
          const inMonth = d.getMonth() === viewMonth;
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          const isPast = min ? iso < min : false;
          const count = counts?.[iso] || 0;
          return (
            <button
              type="button"
              key={iso}
              className={`month-cal-day${inMonth ? '' : ' outside'}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
              disabled={isPast}
              onClick={() => onSelect(iso)}
            >
              {d.getDate()}
              {count > 0 && <span className="month-cal-day-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState('bookings');

  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);

  // --- Bookings calendar: a month's per-day counts, plus one selected
  // day's full booking details below it. Replaces what used to be a flat
  // "all upcoming bookings" table with an actual overview — see calendar.js's
  // getBookingCountsForMonth/listBookingsForDate.
  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [monthCounts, setMonthCounts] = useState({});
  const [viewedMonth, setViewedMonth] = useState(null); // { year, month } the calendar currently shows
  const [dayBookings, setDayBookings] = useState([]);
  const [dayLoading, setDayLoading] = useState(true);
  const [dayError, setDayError] = useState(null);
  const [completingId, setCompletingId] = useState(null);

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

  const loadMonthCounts = useCallback((year, month) => {
    fetch(`${API_BASE}/api/admin/bookings/counts?year=${year}&month=${month}`, { credentials: 'include' })
      .then((r) => (r.status === 401 ? null : r.json()))
      .then((data) => {
        if (data?.counts) setMonthCounts(data.counts);
      })
      .catch(() => {});
  }, []);

  const handleMonthChange = useCallback((year, month) => {
    setViewedMonth({ year, month });
    loadMonthCounts(year, month);
  }, [loadMonthCounts]);

  const loadDayBookings = useCallback((date) => {
    setDayLoading(true);
    setDayError(null);
    fetch(`${API_BASE}/api/admin/bookings/by-date?date=${date}`, { credentials: 'include' })
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
          setDayError(data.error);
        } else {
          setDayBookings(data.bookings || []);
        }
        setDayLoading(false);
      })
      .catch(() => {
        setDayError('Could not reach the server.');
        setDayLoading(false);
      });
  }, [navigate]);

  useEffect(() => {
    if (checkingAuth) return;
    loadDayBookings(selectedDate);
    const interval = setInterval(() => loadDayBookings(selectedDate), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkingAuth, selectedDate, loadDayBookings]);

  // After anything that changes a booking (cancel/reschedule/complete/new
  // walk-in), refresh both the selected day's list and the visible month's
  // counts — a walk-in or reschedule can change which days have bookings.
  const refreshAll = useCallback(() => {
    loadDayBookings(selectedDate);
    if (viewedMonth) loadMonthCounts(viewedMonth.year, viewedMonth.month);
  }, [loadDayBookings, selectedDate, viewedMonth, loadMonthCounts]);

  const handleLogout = useCallback(async (timedOut) => {
    await fetch(`${API_BASE}/api/admin/logout`, { method: 'POST', credentials: 'include' });
    navigate('/admin', timedOut ? { state: { timedOut: true } } : undefined);
  }, [navigate]);

  // Idle sign-out: staff computers at the front desk sit unattended between
  // clients, and the bookings list shows every client's full name, email
  // and phone — so an idle admin session auto-signs-out (with a warning
  // first) the same way client accounts do. See hooks/useIdleTimeout.js and
  // config/sessionTimeout.js for the shared behaviour/durations.
  const heartbeat = useCallback(() => {
    fetch(`${API_BASE}/api/admin/session`, { credentials: 'include' }).catch(() => {});
  }, []);

  const { secondsLeft: idleWarningSecondsLeft, stayActive } = useIdleTimeout({
    enabled: !checkingAuth,
    idleMs: IDLE_TIMEOUT_MS,
    warningMs: IDLE_WARNING_MS,
    onTimeout: () => handleLogout(true),
    onHeartbeat: heartbeat,
  });

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking? The client will be emailed to let them know. This cannot be undone.')) return;
    const res = await fetch(`${API_BASE}/api/admin/bookings/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      refreshAll();
    } else {
      alert('Could not cancel the booking. Please try again.');
    }
  };

  const handleComplete = async (id) => {
    if (!confirm("Mark this booking as completed? The client will be emailed a thank-you and asked to leave a review.")) return;
    setCompletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings/${id}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        refreshAll();
      } else {
        alert('Could not mark this booking as completed. Please try again.');
      }
    } finally {
      setCompletingId(null);
    }
  };

  if (checkingAuth) {
    return <div className="admin-shell"><p className="admin-loading">Checking session…</p></div>;
  }

  return (
    <div className="admin-shell">
      <SessionTimeoutWarning
        show={idleWarningSecondsLeft != null}
        secondsLeft={idleWarningSecondsLeft}
        onStay={stayActive}
        onSignOut={() => handleLogout(false)}
        label="admin session"
      />
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">La Derma</p>
          <h1 className="admin-title">Bookings dashboard</h1>
        </div>
        <div className="admin-header-actions">
          <span className="admin-username">{username}</span>
          <button className="btn btn-outline" onClick={() => handleLogout(false)}>Log Out</button>
        </div>
      </header>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab${activeTab === 'bookings' ? ' active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === 'pricing' ? ' active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          Treatments & Pricing
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === 'availability' ? ' active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          Availability
        </button>
      </div>

      {activeTab === 'bookings' && (
        <>
          <div className="admin-toolbar">
            <button
              className="btn btn-gold"
              onClick={() => {
                setReschedulingBooking(null);
                setShowWalkInForm((v) => !v);
              }}
            >
              {showWalkInForm ? 'Close' : '+ New Walk-in Booking'}
            </button>
          </div>

          {showWalkInForm && (
            <WalkInForm
              onCreated={() => {
                setShowWalkInForm(false);
                refreshAll();
              }}
            />
          )}

          {reschedulingBooking && (
            <RescheduleForm
              booking={reschedulingBooking}
              onDone={() => {
                setReschedulingBooking(null);
                refreshAll();
              }}
              onCancel={() => setReschedulingBooking(null)}
            />
          )}

          <div className="availability-grid">
            <div>
              <p className="panel-eyebrow">Calendar</p>
              <MonthCalendar
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                counts={monthCounts}
                onMonthChange={handleMonthChange}
              />
            </div>

            <div className="sidebar">
              <div className="sidebar-block">
                <p className="sidebar-block-label">{formatDateLabel(selectedDate)}</p>

                {dayError && <div className="admin-notice admin-notice-error">{dayError}</div>}
                {dayLoading && !dayError && <p className="admin-loading">Loading bookings…</p>}
                {!dayLoading && !dayError && dayBookings.length === 0 && (
                  <p className="admin-empty">No bookings this day.</p>
                )}

                {!dayLoading && dayBookings.length > 0 && (
                  <div className="day-booking-list">
                    {dayBookings.map((b) => (
                      <div className="day-booking-card" key={b.id}>
                        <div className="day-booking-head">
                          <span className="day-booking-time">
                            {new Date(b.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}
                          </span>
                          {b.completed && <span className="day-booking-completed">✓ Completed</span>}
                        </div>
                        <p className="day-booking-name">{b.clientName || '—'}</p>
                        <p className="admin-muted">{b.treatment || '—'}</p>
                        <p className="admin-muted">{b.clientEmail || '—'}{b.clientPhone ? ` · ${b.clientPhone}` : ''}</p>
                        {b.notes && <p className="admin-notes-cell">{b.notes}</p>}

                        {!b.completed && (
                          <div className="admin-row-actions" style={{ marginTop: 12 }}>
                            <button
                              className="admin-reschedule-btn"
                              onClick={() => {
                                setShowWalkInForm(false);
                                setReschedulingBooking(b);
                              }}
                            >
                              Reschedule
                            </button>
                            <button className="admin-cancel-btn" onClick={() => handleCancel(b.id)}>Cancel</button>
                            <button
                              className="admin-complete-btn"
                              disabled={completingId === b.id}
                              onClick={() => handleComplete(b.id)}
                            >
                              {completingId === b.id ? 'Completing…' : 'Complete'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'pricing' && <PricingManager />}
      {activeTab === 'availability' && <AvailabilityManager />}
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
        <label>Date</label>
        <MonthCalendar selectedDate={date} onSelect={setDate} minDate={todayISODate()} />
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

// ---------------------------------------------------------------------------
// Reschedule — moves an existing booking to a new date/time in place (same
// underlying Calendar event, see server/calendar.js's rescheduleBooking),
// and sends the client a branded "your consultation has been rescheduled"
// email instead of a cancel + a fresh confirmation. Reuses the same
// calendar + slot-grid pattern as the walk-in form above, just scoped to
// one existing booking rather than creating a new one.
// ---------------------------------------------------------------------------
function RescheduleForm({ booking, onDone, onCancel }) {
  const [date, setDate] = useState(toLocalISODate(new Date(booking.start)));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    fetch(`${API_BASE}/api/admin/availability?date=${date}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError('Select a new time first.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings/${booking.id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newStartISO: selectedSlot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reschedule this booking.');
      onDone();
    } catch (err) {
      setError(err.message || 'Could not reschedule this booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-walkin-form" onSubmit={handleSubmit}>
      <h2 className="admin-walkin-title">Reschedule booking</h2>
      <p className="admin-loading" style={{ marginTop: -6, marginBottom: 20 }}>
        {booking.clientName || 'Client'} — {booking.treatment || 'Consultation'}, currently {formatDateTime(booking.start, 'Europe/London')}
      </p>

      <div className="admin-field">
        <label>New date</label>
        <MonthCalendar selectedDate={date} onSelect={setDate} minDate={todayISODate()} />
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

      {error && (
        <ul className="admin-form-errors">
          <li>{error}</li>
        </ul>
      )}

      <div className="pricing-form-actions" style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-gold" disabled={submitting || !selectedSlot}>
          {submitting ? 'Rescheduling…' : 'Confirm New Time'}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Availability tab — a full month calendar (click a date to see that
// day's live consultation times below it), plus a way to block out whole
// days or specific time ranges when the clinic is unavailable. A block is
// just a real event on the connected Google Calendar (see server/calendar.js),
// so it's picked up by the existing free/busy check immediately — no
// separate "blocked" concept for the booking logic to know about.
// ---------------------------------------------------------------------------
function AvailabilityManager() {
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  const [blocks, setBlocks] = useState([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blocksError, setBlocksError] = useState(null);

  const [showBlockForm, setShowBlockForm] = useState(false);

  const loadSlots = useCallback((d) => {
    setSlotsLoading(true);
    setSlotsError(null);
    fetch(`${API_BASE}/api/admin/availability?date=${d}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setSlotsError(data.error);
          setSlots([]);
        } else {
          setSlots(data.slots || []);
        }
        setSlotsLoading(false);
      })
      .catch(() => {
        setSlotsError('Could not load availability for this day.');
        setSlotsLoading(false);
      });
  }, []);

  const loadBlocks = useCallback(() => {
    setBlocksLoading(true);
    fetch(`${API_BASE}/api/admin/blocks`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setBlocksError(data.error);
        } else {
          setBlocksError(null);
          setBlocks(data.blocks || []);
        }
        setBlocksLoading(false);
      })
      .catch(() => {
        setBlocksError('Could not load blocked times.');
        setBlocksLoading(false);
      });
  }, []);

  useEffect(() => { loadSlots(date); }, [date, loadSlots]);
  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  const handleRemoveBlock = async (id) => {
    if (!confirm('Remove this block? That time will become bookable again.')) return;
    const res = await fetch(`${API_BASE}/api/admin/blocks/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      loadSlots(date);
    } else {
      alert('Could not remove that block. Please try again.');
    }
  };

  return (
    <div className="availability-manager">
      <div className="availability-grid">
        {/* Left: full calendar + that day's times */}
        <div>
          <p className="panel-eyebrow">Calendar</p>
          <MonthCalendar selectedDate={date} onSelect={setDate} />

          <div className="availability-day-block">
            <p className="availability-day-title">{formatDateLabel(date)}</p>

            {slotsLoading && <p className="admin-loading">Loading times…</p>}
            {slotsError && <div className="admin-notice admin-notice-error">{slotsError}</div>}
            {!slotsLoading && !slotsError && slots.length === 0 && (
              <p className="admin-empty">No available times this day — fully booked, blocked, or closed.</p>
            )}
            {!slotsLoading && !slotsError && slots.length > 0 && (
              <div className="admin-slot-grid">
                {slots.map((iso) => (
                  <span key={iso} className="admin-slot-btn admin-slot-readonly">
                    {new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: blocked-time manager */}
        <div className="sidebar">
          <div className="sidebar-block">
            <div className="admin-toolbar availability-toolbar">
              <p className="sidebar-block-label" style={{ margin: 0 }}>Blocked time</p>
              <button className="btn btn-gold btn-sm" onClick={() => setShowBlockForm((v) => !v)}>
                {showBlockForm ? 'Close' : '+ Block time'}
              </button>
            </div>

            {showBlockForm && (
              <BlockForm
                defaultDate={date}
                onCreated={() => {
                  setShowBlockForm(false);
                  loadBlocks();
                  loadSlots(date);
                }}
              />
            )}

            {blocksError && <div className="admin-notice admin-notice-error">{blocksError}</div>}
            {blocksLoading && !blocksError && <p className="admin-loading">Loading…</p>}
            {!blocksLoading && !blocksError && blocks.length === 0 && (
              <p className="admin-empty">Nothing blocked right now.</p>
            )}
            {!blocksLoading && blocks.length > 0 && (
              <ul className="block-list">
                {blocks.map((b) => (
                  <li key={b.id} className="block-list-row">
                    <div>
                      <p className="block-list-summary">{b.summary}</p>
                      <p className="block-list-when">
                        {b.allDay
                          ? new Date(`${b.start}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · All day'
                          : formatDateTime(b.start, 'Europe/London') + ' – ' + new Date(b.end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}
                      </p>
                    </div>
                    <button className="admin-cancel-btn" onClick={() => handleRemoveBlock(b.id)}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function BlockForm({ defaultDate, onCreated }) {
  const [mode, setMode] = useState('day'); // 'day' | 'range'
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [label, setLabel] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'range' && startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }

    setSubmitting(true);
    const body = mode === 'day'
      ? { dateStr: date, allDay: true, label }
      : { startISO: `${date}T${startTime}:00`, endISO: `${date}T${endTime}:00`, label };

    try {
      const res = await fetch(`${API_BASE}/api/admin/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not block that time.');
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="pricing-inline-form" onSubmit={handleSubmit}>
      <div className="block-form-mode">
        <button type="button" className={`block-form-mode-btn${mode === 'day' ? ' active' : ''}`} onClick={() => setMode('day')}>
          Whole day
        </button>
        <button type="button" className={`block-form-mode-btn${mode === 'range' ? ' active' : ''}`} onClick={() => setMode('range')}>
          Time range
        </button>
      </div>

      <div className="admin-field">
        <label htmlFor="block-date">Date</label>
        <input id="block-date" type="date" value={date} min={todayISODate()} onChange={(e) => setDate(e.target.value)} required />
      </div>

      {mode === 'range' && (
        <div className="admin-field-row">
          <div className="admin-field">
            <label htmlFor="block-start">From</label>
            <input id="block-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div className="admin-field">
            <label htmlFor="block-end">To</label>
            <input id="block-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
        </div>
      )}

      <div className="admin-field">
        <label htmlFor="block-label">Reason (optional)</label>
        <input id="block-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Holiday, Lunch, Staff training" />
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="pricing-form-actions">
        <button type="submit" className="btn btn-gold btn-sm" disabled={submitting}>
          {submitting ? 'Blocking…' : 'Block this time'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Treatments & Pricing tab — full CRUD on categories and their items,
// backed by the admin-only /api/admin/pricing/* routes (see server/index.js
// and server/pricingStore.js). The public site's Treatments & Pricing page
// reads the same data via GET /api/pricing, so changes made here appear
// live on the site with no redeploy.
// ---------------------------------------------------------------------------
function PricingManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

  const loadCategories = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/pricing`)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || []);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load treatments and pricing.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = async ({ title, description }) => {
    const res = await fetch(`${API_BASE}/api/admin/pricing/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not create category.');
    setShowNewCategoryForm(false);
    loadCategories();
  };

  const handleUpdateCategory = async (id, { title, description }) => {
    const res = await fetch(`${API_BASE}/api/admin/pricing/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not update category.');
    loadCategories();
  };

  const handleDeleteCategory = async (id, title) => {
    if (!confirm(`Delete "${title}" and all of its items? This cannot be undone.`)) return;
    const res = await fetch(`${API_BASE}/api/admin/pricing/categories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      loadCategories();
    } else {
      alert('Could not delete the category. Please try again.');
    }
  };

  const handleCreateItem = async (categoryId, { name, price }) => {
    const res = await fetch(`${API_BASE}/api/admin/pricing/categories/${categoryId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, price }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not add item.');
    loadCategories();
  };

  const handleUpdateItem = async (itemId, { name, price }) => {
    const res = await fetch(`${API_BASE}/api/admin/pricing/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, price }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not update item.');
    loadCategories();
  };

  const handleDeleteItem = async (itemId, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`${API_BASE}/api/admin/pricing/items/${itemId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      loadCategories();
    } else {
      alert('Could not delete the item. Please try again.');
    }
  };

  return (
    <div className="pricing-manager">
      <div className="admin-toolbar">
        <button className="btn btn-gold" onClick={() => setShowNewCategoryForm((v) => !v)}>
          {showNewCategoryForm ? 'Close' : '+ New Category'}
        </button>
        <span className="admin-updated">{categories.length} categories</span>
      </div>

      {showNewCategoryForm && (
        <CategoryForm
          onSubmit={handleCreateCategory}
          onCancel={() => setShowNewCategoryForm(false)}
          submitLabel="Create Category"
        />
      )}

      {error && <div className="admin-notice admin-notice-error">{error}</div>}
      {loading && !error && <p className="admin-loading">Loading treatments…</p>}
      {!loading && !error && categories.length === 0 && (
        <p className="admin-empty">No categories yet. Create one to get started.</p>
      )}

      {!loading && categories.length > 0 && (
        <div className="pricing-category-list">
          {categories.map((cat) => (
            <PricingCategoryRow
              key={cat.id}
              category={cat}
              expanded={expandedId === cat.id}
              onToggle={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
              onUpdateCategory={(fields) => handleUpdateCategory(cat.id, fields)}
              onDeleteCategory={() => handleDeleteCategory(cat.id, cat.title)}
              onCreateItem={(fields) => handleCreateItem(cat.id, fields)}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PricingCategoryRow({
  category,
  expanded,
  onToggle,
  onUpdateCategory,
  onDeleteCategory,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}) {
  const [editingCategory, setEditingCategory] = useState(false);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  return (
    <div className="pricing-category-row">
      <div className="pricing-category-head" onClick={onToggle}>
        <div>
          <h3 className="pricing-category-title">{category.title}</h3>
          <p className="pricing-category-desc">{category.desc}</p>
        </div>
        <div className="pricing-category-head-right">
          <span className="category-count">{category.items.length} items</span>
          <span className={`pricing-chevron${expanded ? ' open' : ''}`}>▾</span>
        </div>
      </div>

      {expanded && (
        <div className="pricing-category-body" onClick={(e) => e.stopPropagation()}>
          {editingCategory ? (
            <CategoryForm
              initial={{ title: category.title, description: category.desc }}
              onSubmit={async (fields) => {
                await onUpdateCategory(fields);
                setEditingCategory(false);
              }}
              onCancel={() => setEditingCategory(false)}
              submitLabel="Save Category"
            />
          ) : (
            <div className="pricing-category-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setEditingCategory(true)}>Edit Category</button>
              <button className="admin-cancel-btn" onClick={onDeleteCategory}>Delete Category</button>
            </div>
          )}

          <div className="pricing-item-list">
            {category.items.map((item) =>
              editingItemId === item.id ? (
                <ItemForm
                  key={item.id}
                  initial={{ name: item.name, price: item.price }}
                  onSubmit={async (fields) => {
                    await onUpdateItem(item.id, fields);
                    setEditingItemId(null);
                  }}
                  onCancel={() => setEditingItemId(null)}
                  submitLabel="Save Item"
                />
              ) : (
                <div className="pricing-item-row" key={item.id}>
                  <p className="price-name">{item.name}</p>
                  <p className="price-value">{item.price}</p>
                  <div className="pricing-item-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setEditingItemId(item.id)}>Edit</button>
                    <button className="admin-cancel-btn" onClick={() => onDeleteItem(item.id, item.name)}>Delete</button>
                  </div>
                </div>
              )
            )}
          </div>

          {showNewItemForm ? (
            <ItemForm
              onSubmit={async (fields) => {
                await onCreateItem(fields);
                setShowNewItemForm(false);
              }}
              onCancel={() => setShowNewItemForm(false)}
              submitLabel="Add Item"
            />
          ) : (
            <button className="btn btn-outline btn-sm pricing-add-item-btn" onClick={() => setShowNewItemForm(true)}>
              + Add Item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title, description });
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="pricing-inline-form" onSubmit={handleSubmit}>
      <div className="admin-field">
        <label>Category title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="admin-field">
        <label>Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error && <p className="admin-error">{error}</p>}
      <div className="pricing-form-actions">
        <button type="submit" className="btn btn-gold btn-sm" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ItemForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [name, setName] = useState(initial?.name || '');
  const [price, setPrice] = useState(initial?.price || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name, price });
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="pricing-inline-form pricing-item-form" onSubmit={handleSubmit}>
      <div className="admin-field-row">
        <div className="admin-field">
          <label>Item name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="admin-field">
          <label>Price</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. £150 or Free" required />
        </div>
      </div>
      {error && <p className="admin-error">{error}</p>}
      <div className="pricing-form-actions">
        <button type="submit" className="btn btn-gold btn-sm" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
