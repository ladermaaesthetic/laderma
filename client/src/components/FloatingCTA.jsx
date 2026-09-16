import { NavLink, useLocation } from 'react-router-dom';
import './FloatingCTA.css';

export default function FloatingCTA() {
  const { pathname } = useLocation();

  // Don't show the floating button on the booking page itself.
  if (pathname === '/booking') return null;

  return (
    <div className="floating-cta">
      <NavLink to="/booking" className="btn btn-gold">Book Consultation</NavLink>
    </div>
  );
}
