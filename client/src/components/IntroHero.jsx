import './IntroHero.css';

export default function IntroHero({ badge, eyebrow, title, lede }) {
  return (
    <section className="intro" style={{ padding: 0 }}>
      <div className="intro-bg" />
      <div className="container intro-inner">
        <div className="intro-badge">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
          </svg>
          {badge}
        </div>

        <p className="intro-eyebrow" style={{ marginTop: 24 }}>{eyebrow}</p>
        <h1 className="intro-title">{title}</h1>
        <p className="intro-lede">{lede}</p>
      </div>
    </section>
  );
}
