// Central place for anything reused across components — carried over
// verbatim from the original site (same CDN image URLs, same copy).

export const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/pricing', label: 'Treatments & Pricing', dropdown: true },
  { href: '/reviews', label: 'Reviews' },
  { href: '/location', label: 'Location' },
];

export const LOGO_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663448677533/D7fnEQUJWHBXWGYDWnFdAo/la-derma-logo_de083f56.jpg';

export const IMAGES = {
  heroMain:
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663448677533/D7fnEQUJWHBXWGYDWnFdAo/home-first-photo-replacement_8402a734.jpeg',
  aboutBg:
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663448677533/D7fnEQUJWHBXWGYDWnFdAo/la-derma-abstract-brand-aAz65ze4gvr455jiWTv9Vk.webp',
  treatmentRoom:
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663448677533/D7fnEQUJWHBXWGYDWnFdAo/WhatsAppImage2026-04-15at13.49.17(1)_177f5674.jpeg',
  bookingPhoto:
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663448677533/D7fnEQUJWHBXWGYDWnFdAo/home-last-photo-replacement_2d7bfa36.jpeg',
};

export const TREATMENT_OPTIONS = [
  'Laser Hair Consultation',
  'Endolift Consultation',
  'Anti-Wrinkle Consultation',
  'Dermal Filler Consultation',
  'Skin Rejuvenation Consultation',
  'GLP-1 Weight Loss Consultation',
];

export const CLINIC_ADDRESS = {
  line1: '19 Jackson St',
  city: 'Gateshead',
  postcode: 'NE8 1EE',
  full: '19 Jackson St, Gateshead NE8 1EE',
  // A reconstructable Google Maps search URL rather than a maps.app.goo.gl
  // short link — a short link is an opaque saved-place ID that can't be
  // safely hand-edited when the address changes (no way to confirm what
  // it actually points to), so this is the correct address every time by
  // construction rather than by guesswork.
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=19+Jackson+St%2C+Gateshead+NE8+1EE',
  googleMapsEmbedSrc: 'https://www.google.com/maps?q=19+Jackson+St%2C+Gateshead+NE8+1EE&output=embed',
};

export const CLINIC_PHONE = '07745 756448';
export const CLINIC_PHONE_HREF = 'tel:+447745756448';

export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/people/La-Derma-Aesthetic-Clinic/100085383892345/',
  instagram: 'https://www.instagram.com/ladermaaesthetic',
};

// Footer-only link groups — "Company" is about/reputation-facing pages,
// "Explore" is the treatment/booking-facing pages. Kept separate from
// NAV_LINKS since the footer's grouping differs from the header's.
export const FOOTER_COMPANY_LINKS = [
  { href: '/about', label: 'About Us' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/location', label: 'Location' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-of-service', label: 'Terms of Service' },
];

export const FOOTER_EXPLORE_LINKS = [
  { href: '/pricing', label: 'Treatments & Pricing' },
  { href: '/booking', label: 'Book a Consultation' },
  { href: '/account', label: 'My Account' },
  { href: '/', label: 'Home' },
];
