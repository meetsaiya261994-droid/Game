import React from 'react';
import { GemColor, GemSpecial } from '../game/types';

interface GemSvgProps {
  color: GemColor;
  special: GemSpecial;
  className?: string;
}

export const GemSvg: React.FC<GemSvgProps> = ({ color, special, className = 'w-full h-full' }) => {
  if (special === 'RAINBOW') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <defs>
          <radialGradient id="rainbowCore" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#fde047" />
            <stop offset="55%" stopColor="#ec4899" />
            <stop offset="80%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6d28d9" />
          </radialGradient>
        </defs>
        <polygon
          points="32,4 42,20 60,24 47,38 50,58 32,49 14,58 17,38 4,24 22,20"
          fill="url(#rainbowCore)"
          stroke="#fef08a"
          strokeWidth="2.5"
        />
        <circle cx="32" cy="33" r="10" fill="#ffffff" fillOpacity="0.72" />
        <polygon points="32,19 36,29 46,33 36,37 32,47 28,37 18,33 28,29" fill="#fef9c3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {color === 'ruby' && (
        <g>
          <polygon points="32,6 56,28 32,58 8,28" fill="#dc2626" stroke="#fca5a5" strokeWidth="2" />
          <polygon points="32,6 44,28 32,58 20,28" fill="#ef4444" />
          <polygon points="32,14 42,28 32,42 22,28" fill="#f87171" fillOpacity="0.85" />
          <polygon points="20,20 32,10 38,22" fill="#ffffff" fillOpacity="0.45" />
        </g>
      )}
      {color === 'sapphire' && (
        <g>
          <polygon points="32,6 54,24 46,56 18,56 10,24" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="2" />
          <polygon points="32,12 46,26 40,48 24,48 18,26" fill="#2563eb" />
          <polygon points="32,16 40,28 32,42 24,28" fill="#60a5fa" fillOpacity="0.85" />
          <polygon points="20,22 32,12 36,24" fill="#ffffff" fillOpacity="0.42" />
        </g>
      )}
      {color === 'emerald' && (
        <g>
          <polygon
            points="20,8 44,8 56,20 56,44 44,56 20,56 8,44 8,20"
            fill="#059669"
            stroke="#6ee7b7"
            strokeWidth="2"
          />
          <polygon
            points="23,14 41,14 50,23 50,41 41,50 23,50 14,41 14,23"
            fill="#10b981"
          />
          <rect x="22" y="22" width="20" height="20" rx="3" fill="#6ee7b7" fillOpacity="0.72" />
          <polygon points="16,22 24,14 34,14 20,28" fill="#ffffff" fillOpacity="0.42" />
        </g>
      )}
      {color === 'topaz' && (
        <g>
          <polygon
            points="32,6 56,19 56,45 32,58 8,45 8,19"
            fill="#d97706"
            stroke="#fde047"
            strokeWidth="2"
          />
          <polygon
            points="32,12 49,22 49,42 32,52 15,42 15,22"
            fill="#f59e0b"
          />
          <polygon points="32,18 42,32 32,46 22,32" fill="#fef08a" fillOpacity="0.8" />
          <polygon points="18,22 32,12 38,20" fill="#ffffff" fillOpacity="0.45" />
        </g>
      )}
      {color === 'amethyst' && (
        <g>
          <rect x="10" y="10" width="44" height="44" rx="12" fill="#7c3aed" stroke="#d8b4fe" strokeWidth="2" />
          <polygon points="32,14 48,32 32,50 16,32" fill="#9333ea" />
          <circle cx="32" cy="32" r="10" fill="#c084fc" fillOpacity="0.85" />
          <polygon points="20,20 34,16 26,28" fill="#ffffff" fillOpacity="0.45" />
        </g>
      )}

      {/* Special Gem Overlays */}
      {special === 'ROCKET_H' && (
        <g>
          <rect x="6" y="27" width="52" height="10" rx="5" fill="#fef08a" fillOpacity="0.95" stroke="#78350f" strokeWidth="1.5" />
          <polygon points="4,32 15,23 15,41" fill="#ffffff" />
          <polygon points="60,32 49,23 49,41" fill="#ffffff" />
        </g>
      )}
      {special === 'ROCKET_V' && (
        <g>
          <rect x="27" y="6" width="10" height="52" rx="5" fill="#fef08a" fillOpacity="0.95" stroke="#78350f" strokeWidth="1.5" />
          <polygon points="32,4 23,15 41,15" fill="#ffffff" />
          <polygon points="32,60 23,49 41,49" fill="#ffffff" />
        </g>
      )}
      {special === 'BOMB' && (
        <g>
          <circle cx="32" cy="32" r="16" fill="#1c1917" fillOpacity="0.88" stroke="#facc15" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="8" fill="#fb923c" />
          <circle cx="32" cy="32" r="4" fill="#fef9c3" />
          <line x1="32" y1="12" x2="32" y2="18" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
          <line x1="32" y1="46" x2="32" y2="52" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
          <line x1="12" y1="32" x2="18" y2="32" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
          <line x1="46" y1="32" x2="52" y2="32" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};
