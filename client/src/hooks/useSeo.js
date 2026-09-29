import { useEffect } from 'react';

const SITE_NAME = 'La Derma Aesthetic Clinic';
const SITE_URL = 'https://ladermaaesthatic.com';
const DEFAULT_IMAGE = `${SITE_URL}/location/clinic-entrance.webp`;

function upsertMeta(attr, key, content) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

// Sets this page's <title>, meta description, canonical URL, and Open Graph
// / Twitter card tags on mount — this is a plain SPA (no server rendering),
// so each page's own component is what makes it show a distinct title and
// preview card in search results and link shares, instead of every route
// showing the same generic homepage title from index.html.
export function useSeo({ title, description, path = '', image = DEFAULT_IMAGE, noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const url = `${SITE_URL}${path}`;

    document.title = fullTitle;
    if (description) upsertMeta('name', 'description', description);
    upsertCanonical(url);
    // Sign-in/account/admin pages aren't useful search results and shouldn't
    // compete with the real marketing pages for ranking.
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertMeta('property', 'og:title', fullTitle);
    if (description) upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    if (description) upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
  }, [title, description, path, image]);
}
