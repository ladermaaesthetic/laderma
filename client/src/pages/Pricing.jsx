import { useEffect, useRef, useState } from 'react';
import IntroHero from '../components/IntroHero';
import { PROCEDURES } from '../data/pricingData';
import './Pricing.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function Pricing() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [activeId, setActiveId] = useState(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const scrollerRef = useRef(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(89);

  // Live treatment/pricing data now comes from the admin-managed database
  // via the API, rather than the static pricingData.js bundle — so admin
  // edits show up on the site immediately, with no rebuild or redeploy.
  useEffect(() => {
    fetch(`${API_BASE}/api/pricing`)
      .then((r) => {
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then((data) => {
        const cats = data.categories || [];
        setCategories(cats);
        if (cats.length > 0) setActiveId(cats[0].id);
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Could not load treatment pricing right now. Please try again shortly.');
        setLoading(false);
      });
  }, []);

  // Jump straight to a category when arriving via a #category-id link —
  // e.g. from the header's Treatments & Pricing dropdown on another page.
  // Waits for categories to actually be in the DOM first (a delayed
  // scroll after paint, since the sections don't exist until then), and
  // uses a plain instant scroll rather than smooth so the page doesn't
  // visibly animate through the whole list on first load.
  useEffect(() => {
    if (loading || categories.length === 0) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 76;
    window.scrollTo({ top, behavior: 'auto' });
  }, [loading, categories, headerHeight]);

  // Measure the real header height so the sticky jump nav and each card's
  // scroll offset always line up, regardless of font metrics.
  useEffect(() => {
    const header = document.querySelector('.site-header');
    headerRef.current = header;

    const measure = () => {
      if (header) setHeaderHeight(header.offsetHeight);
    };
    measure();
    window.addEventListener('resize', measure);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Highlight the jump-nav pill for whichever category is currently in view.
  useEffect(() => {
    if (categories.length === 0) return;
    const onScroll = () => {
      const y = window.scrollY + headerHeight + 100;
      let current = categories[0].id;
      for (const cat of categories) {
        const el = document.getElementById(cat.id);
        if (el && el.offsetTop <= y) current = cat.id;
      }
      setActiveId(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [headerHeight, categories]);

  // Track whether the pill row is scrolled to its start/end, and whether
  // it overflows at all — used to show/hide the fade hints and arrow
  // buttons appropriately (no arrows needed if everything already fits).
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const update = () => {
      setAtStart(scroller.scrollLeft <= 4);
      setAtEnd(scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4);
      setOverflowing(scroller.scrollWidth > scroller.clientWidth + 4);
    };
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [categories]);

  const scrollByAmount = (direction) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const amount = scroller.clientWidth * 0.7 * direction;
    scroller.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const jumpTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 76;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <>
      <IntroHero
        badge="Treatment menu"
        eyebrow="Treatment menu"
        title="Treatments & pricing"
        lede="Every price below reflects the treatment as delivered at La Derma — clearly listed by area and option, so you can plan your visit with confidence before you book."
      />

      {loading && (
        <section>
          <div className="container">
            <p className="pricing-status">Loading treatment pricing…</p>
          </div>
        </section>
      )}

      {!loading && loadError && (
        <section>
          <div className="container">
            <p className="pricing-status pricing-status-error">{loadError}</p>
          </div>
        </section>
      )}

      {!loading && !loadError && categories.length > 0 && (
        <>
          {/* Sticky category jump nav */}
          <div className="jumpnav-wrap" style={{ top: headerHeight }}>
            <div className="jumpnav-scroll">
              {overflowing && !atStart && (
                <button
                  type="button"
                  className="jumpnav-arrow jumpnav-arrow-left"
                  aria-label="Scroll categories left"
                  onClick={() => scrollByAmount(-1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
              )}
              {overflowing && !atEnd && <div className="jumpnav-fade" />}
              <nav className="jumpnav" ref={scrollerRef} aria-label="Jump to treatment category">
                {categories.map((cat) => (
                  <a
                    key={cat.id}
                    href={`#${cat.id}`}
                    className={activeId === cat.id ? 'active' : undefined}
                    onClick={(e) => { e.preventDefault(); jumpTo(cat.id); }}
                  >
                    {cat.title === 'Wellness, Hair Restoration, and Specialist Treatments' ? 'Wellness' : cat.title}
                  </a>
                ))}
              </nav>
              {overflowing && !atEnd && (
                <button
                  type="button"
                  className="jumpnav-arrow jumpnav-arrow-right"
                  aria-label="Scroll categories right"
                  onClick={() => scrollByAmount(1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Treatment categories */}
          <section>
            <div className="container">
              <div className="category-grid">
                {categories.map((cat) => (
                  <article
                    className="category-card"
                    id={cat.id}
                    key={cat.id}
                    style={{ scrollMarginTop: headerHeight + 76 }}
                  >
                    <div className="category-card-head">
                      <div className="category-card-head-row">
                        <div>
                          <p className="category-eyebrow">Treatment category</p>
                          <h2 className="category-title">{cat.title}</h2>
                        </div>
                        <span className="category-count">{cat.items.length} items</span>
                      </div>
                      <p className="category-desc">{cat.desc}</p>
                    </div>
                    <div className="price-list">
                      {cat.items.map((item) => (
                        <div className="price-row" key={item.id}>
                          <p className="price-name">{item.name}</p>
                          <p className="price-value">{item.price}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Understanding Our Procedures */}
      <section id="procedures">
        <div className="container">
          <div className="section-head">
            <p className="section-eyebrow">Treatment Information</p>
            <h2 className="section-title">Understanding Our Procedures</h2>
          </div>

          <div className="info-grid">
            {PROCEDURES.map((proc) => (
              <article className="info-card" key={proc.title}>
                <h3>{proc.title}</h3>
                {proc.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
                {proc.subsections?.map((sub) => (
                  <div key={sub.label}>
                    <p className="info-subhead">{sub.label}</p>
                    <p>{sub.text}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
