import { useState } from 'react';
import './FadeImage.css';

export default function FadeImage({ src, alt, className = '', fill = false }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'error'

  return (
    <div className={`fade-image-wrap${status === 'error' ? ' fade-image-error' : ''}${fill ? ' fade-image-fill' : ''}`}>
      <img
        src={src}
        alt={alt}
        className={`fade-image${status === 'loaded' ? ' loaded' : ''} ${className}`.trim()}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        loading="lazy"
      />
      {status === 'error' && (
        <div className="fade-image-fallback" role="img" aria-label={alt}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
      )}
    </div>
  );
}
