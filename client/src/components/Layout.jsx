import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import FloatingCTA from './FloatingCTA';
import './Layout.css';

export default function Layout({ children }) {
  const { pathname } = useLocation();

  // React Router does client-side navigation, which never resets scroll
  // position on its own (unlike a normal full page load) — so without
  // this, navigating to a new page leaves you wherever you happened to
  // be scrolled to on the previous page.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <>
      <Header />
      {/* key={pathname} remounts the fade-in on every route change */}
      <main className="page-fade" key={pathname}>{children}</main>
      <FloatingCTA />
      <Footer />
    </>
  );
}
