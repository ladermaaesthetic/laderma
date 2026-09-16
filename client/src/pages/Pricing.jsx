import { useEffect, useRef, useState } from 'react';
import IntroHero from '../components/IntroHero';
import { CATEGORIES, PROCEDURES } from '../data/pricingData';
import './Pricing.css';

export default function Pricing() {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id);
  const [atEnd, setAtEnd] = useState(false);
  const scrollerRef = useRef(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(89);

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
    const onScroll = () => {
      const y = window.scrollY + headerHeight + 100;
      let current = CATEGORIES[0].id;
      for (const cat of CATEGORIES) {
        const el = document.getElementById(cat.id);
        if (el && el.offsetTop <= y) current = cat.id;
      }
      setActiveId(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [headerHeight]);

  // Track whether the pill row is scrolled to its end, to hide the fade hint.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const update = () => {
      setAtEnd(scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4);
    };
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

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

      {/* Sticky category jump nav */}
      <div className="jumpnav-wrap" style={{ top: headerHeight }}>
        <div className="jumpnav-scroll">
          {!atEnd && <div className="jumpnav-fade" />}
          <nav className="jumpnav" ref={scrollerRef} aria-label="Jump to treatment category">
            {CATEGORIES.map((cat) => (
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
        </div>
      </div>

      {/* Treatment categories */}
      <section>
        <div className="container">
          <div className="category-grid">
            {CATEGORIES.map((cat) => (
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
                    <div className="price-row" key={item.name}>
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
