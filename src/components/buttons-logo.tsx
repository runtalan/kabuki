'use client';

import { useState } from 'react';

interface ButtonsLogoProps {
  className?: string;
}

// Simple, clean push-button: one rounded square, one blue-to-green
// gradient, a soft shadow for lift, a thin highlight for a touch of gloss.
// Hover reads as a gentle press.
export function ButtonsLogo({ className = 'w-10 h-10' }: ButtonsLogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${className} relative flex items-center justify-center focus:outline-none group`}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full transition-transform duration-200 ease-out ${
            isHovered ? 'scale-95' : 'scale-100'
          }`}
        >
          <defs>
            <linearGradient id="btnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="btnShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.25" />
            </filter>
          </defs>

          <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#btnGradient)" filter="url(#btnShadow)" />

          {/* Top highlight for a touch of gloss */}
          <path
            d="M 16 18 Q 22 12 32 12"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity={isHovered ? 0.55 : 0.4}
            fill="none"
            className="transition-opacity duration-200"
          />
        </svg>
      </button>

      {/* Minimalist floating tooltip */}
      {isHovered && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 pointer-events-none z-50">
          <div className="relative">
            <div className="px-3 py-2 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 rounded-lg shadow-2xl">
              <p className="text-xs font-medium text-zinc-100 tracking-wide whitespace-nowrap">
                for kabuki
              </p>
            </div>
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-950/80 border border-zinc-800/50 border-b-0 border-r-0 transform rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
