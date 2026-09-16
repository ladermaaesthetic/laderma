import { NavLink } from 'react-router-dom';
import IntroHero from '../components/IntroHero';
import './Gallery.css';

const ENTRIES = [
  {
    num: '01',
    title: 'Spider Veins Laser Treatment',
    desc: 'Uses focused light to heat and destroy small, superficial red or blue vessels on the face and legs, causing them to collapse and fade, often within a few sessions. It is a non-invasive, quick procedure (15 to 30 mins) with minimal downtime.',
  },
  {
    num: '02',
    title: 'Endolift',
    desc: 'Endolift is a minimally invasive, non-surgical laser procedure that tightens skin and reduces localized fat by inserting hair-thin fibers under the skin to stimulate collagen and melt fat.',
  },
  {
    num: '03',
    title: 'Fillers and Anti Wrinkle',
    desc: "Anti wrinkle and dermal fillers are minimally invasive, non-surgical cosmetic injections. Botox relaxes muscles to smooth dynamic wrinkles (crow's feet, forehead lines), lasting 3 to 4 months. Fillers restore lost volume, plump lips, and soften static lines (nasolabial folds), with results lasting 6 to 18+ months. Both can be combined for comprehensive rejuvenation.",
  },
];

export default function Gallery() {
  return (
    <>
      <IntroHero
        badge="Real results"
        eyebrow="Gallery"
        title="A closer look at the outcomes behind our signature treatments."
        lede="Each comparison reflects the careful planning, technique, and aftercare that shape every result at La Derma."
      />

      <section>
        <div className="container entries">
          {ENTRIES.map((entry) => (
            <article className="entry" key={entry.num}>
              <div className="compare">
                <div className="compare-half compare-before"><span>Before</span></div>
                <div className="compare-half compare-after"><span>After</span></div>
                <div className="compare-divider" />
              </div>
              <div className="entry-body">
                <p className="entry-num">{entry.num}</p>
                <h3 className="entry-title">{entry.title}</h3>
                <p className="entry-desc">{entry.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band" style={{ padding: 0 }}>
        <div className="container cta-band-inner">
          <div>
            <h2>See what a personalised plan could look like for you</h2>
            <p>Start with a consultation to discuss suitability, treatment options, and the outcome you want.</p>
          </div>
          <NavLink to="/booking" className="btn btn-gold btn-gold-lg">Book Consultation</NavLink>
        </div>
      </section>
    </>
  );
}
