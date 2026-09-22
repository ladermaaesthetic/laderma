import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import IntroHero from '../components/IntroHero';
import './Pricing.css';
import './CategoryPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// A dedicated page per treatment category (e.g. /pricing/diode-laser),
// rather than just an anchor on the combined Pricing page — mirrors the
// reference site's structure of one page per treatment type. Pulls from
// the same live /api/pricing data as Pricing.jsx, so admin edits show up
// here too with no separate content to maintain.
export default function CategoryPage() {
  const { categoryId } = useParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/pricing`)
      .then((r) => {
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then((data) => {
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Could not load treatment pricing right now. Please try again shortly.');
        setLoading(false);
      });
  }, []);

  const category = categories.find((cat) => cat.id === categoryId) || null;
  const otherCategories = categories.filter((cat) => cat.id !== categoryId);

  if (loading) {
    return (
      <section>
        <div className="container">
          <p className="pricing-status">Loading treatment details…</p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section>
        <div className="container">
          <p className="pricing-status pricing-status-error">{loadError}</p>
        </div>
      </section>
    );
  }

  if (!category) {
    return (
      <section>
        <div className="container">
          <p className="pricing-status">
            We couldn't find that treatment category. <Link to="/pricing">View all treatments &amp; pricing.</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <IntroHero
        badge="Treatment menu"
        eyebrow="Treatments & Pricing"
        title={category.title}
        lede={category.desc}
      />

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <Link to="/pricing" className="category-page-back">
            <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
              <path d="M8 1L2 7l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All treatments &amp; pricing
          </Link>

          <div className="price-list category-page-list">
            {category.items.map((item) => (
              <div className="price-row" key={item.id}>
                <p className="price-name">{item.name}</p>
                <p className="price-value">{item.price}</p>
              </div>
            ))}
          </div>

          <div className="category-page-cta">
            <Link to="/booking" className="btn btn-gold btn-gold-lg">Book a Consultation</Link>
          </div>
        </div>
      </section>

      {otherCategories.length > 0 && (
        <section className="category-page-related">
          <div className="container">
            <p className="section-eyebrow">Explore more</p>
            <h2 className="section-title">Other treatment categories</h2>
            <div className="category-page-related-grid">
              {otherCategories.map((cat) => (
                <Link key={cat.id} to={`/pricing/${cat.id}`} className="category-page-related-card">
                  <span className="category-page-related-title">{cat.title}</span>
                  <span className="category-page-related-count">{cat.items.length} treatments</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
