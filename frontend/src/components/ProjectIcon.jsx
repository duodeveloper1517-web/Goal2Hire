import { useEffect, useRef } from 'react';

export default function ProjectIcon({ state = 'smile', size = 48 }) {
  const svgRef = useRef(null);

  // Dynamic favicon update
  useEffect(() => {
    if (svgRef.current) {
      const svgString = new XMLSerializer().serializeToString(svgRef.current);
      const faviconLink = document.querySelector("link[rel~='icon']") || document.createElement('link');
      faviconLink.type = 'image/svg+xml';
      faviconLink.rel = 'icon';
      faviconLink.href = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
      document.getElementsByTagName('head')[0].appendChild(faviconLink);
    }
  }, [state]);

  // Color variables based on state
  const colors = {
    smile: {
      bg: 'url(#gradient-smile)',
      eyes: '#1a1a2e',
      mouth: '#1a1a2e',
      eyebrows: 'transparent',
      faceBorder: '#6366f1'
    },
    angry: {
      bg: 'url(#gradient-angry)',
      eyes: '#2d0c0c',
      mouth: '#2d0c0c',
      eyebrows: '#2d0c0c',
      faceBorder: '#ef4444'
    },
    sad: {
      bg: 'url(#gradient-sad)',
      eyes: '#1e293b',
      mouth: '#1e293b',
      eyebrows: '#475569',
      faceBorder: '#64748b'
    }
  };

  const current = colors[state] || colors.smile;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}
    >
      <defs>
        {/* Smile Gradient (Vibrant Indigo-Violet) */}
        <linearGradient id="gradient-smile" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        {/* Angry Gradient (Vibrant Orange-Red) */}
        <linearGradient id="gradient-angry" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        {/* Sad Gradient (Cold Blue-Slate) */}
        <linearGradient id="gradient-sad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      {/* Main Face Circle */}
      <circle cx="50" cy="50" r="45" fill={current.bg} stroke={current.faceBorder} strokeWidth="3" />

      {/* Nose - Small triangle/arc in center */}
      <path d="M 50,45 L 47,52 L 53,52 Z" fill={state === 'angry' ? '#2d0c0c' : '#ffffff'} opacity="0.8" />

      {/* Eyes and Eyebrows based on state */}
      {state === 'smile' && (
        <>
          {/* Smiling, happy eyes (arched upwards) */}
          <path d="M 30,40 Q 35,33 40,40" stroke={current.eyes} strokeWidth="5.5" strokeLinecap="round" fill="none" />
          <path d="M 60,40 Q 65,33 70,40" stroke={current.eyes} strokeWidth="5.5" strokeLinecap="round" fill="none" />
          {/* Happy, open smile */}
          <path d="M 32,60 Q 50,78 68,60" stroke={current.mouth} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Angry face */}
      {state === 'angry' && (
        <>
          {/* Angry slanted eyebrows */}
          <path d="M 26,30 L 42,38" stroke={current.eyebrows} strokeWidth="5" strokeLinecap="round" />
          <path d="M 74,30 L 58,38" stroke={current.eyebrows} strokeWidth="5" strokeLinecap="round" />
          {/* Sharp, focused eyes */}
          <circle cx="34" cy="43" r="6" fill={current.eyes} />
          <circle cx="66" cy="43" r="6" fill={current.eyes} />
          {/* Angry downturned mouth */}
          <path d="M 35,68 Q 50,55 65,68" stroke={current.mouth} strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Sad face */}
      {state === 'sad' && (
        <>
          {/* Worried, curved eyebrows */}
          <path d="M 28,34 Q 35,30 42,35" stroke={current.eyebrows} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 72,34 Q 65,30 58,35" stroke={current.eyebrows} strokeWidth="4" strokeLinecap="round" fill="none" />
          {/* Sad, small round eyes */}
          <circle cx="35" cy="43" r="5" fill={current.eyes} />
          <circle cx="65" cy="43" r="5" fill={current.eyes} />
          {/* Frowning mouth */}
          <path d="M 36,68 Q 50,56 64,68" stroke={current.mouth} strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* Tear drop on one eye */}
          <path d="M 35,48 C 32,54 38,58 35,58 C 32,58 32,54 35,48 Z" fill="#38bdf8" />
        </>
      )}
    </svg>
  );
}
