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
  const [activeTab, setActiveTab] = useState('bookings');

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
      </div>

      {activeTab === 'bookings' && (
        <>
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
        </>
      )}

      {activeTab === 'pricing' && <PricingManager />}
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
