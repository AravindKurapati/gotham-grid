'use client';
import { useTheme } from '@/lib/theme-context';

export default function Footer() {
  const { theme } = useTheme();
  const isCrt = theme === 'crt';
  const textColor = isCrt ? 'text-crt-green/25' : 'text-flap-yellow/20';
  const shieldColor = isCrt ? '#33ff33' : '#f0e68c';

  return (
    <footer className={`relative font-mono text-xs ${textColor} py-2 mt-1 text-center overflow-hidden select-none`}>
      {/*
        Kryptonian S — House of El glyph.
        5% opacity. Only visible if you're looking for it.
        Shield shape with even-odd fill: the S cutout shows through.
      */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 80 100"
          width="56"
          height="70"
          aria-hidden="true"
          style={{ opacity: 0.05 }}
        >
          <path
            fill={shieldColor}
            fillRule="evenodd"
            d={[
              // Shield outline (pentagon)
              'M40,2 L72,2 L78,42 L40,98 L2,42 L8,2 Z',
              // Top C of S — opens right
              'M22,20 L58,20 L58,32 L38,32 L38,46 L22,46 Z',
              // Diagonal connector band
              'M38,46 L58,46 L50,54 L22,54 Z',
              // Bottom C of S — opens left
              'M50,54 L58,54 L58,80 L22,80 L22,68 L50,68 Z',
            ].join(' ')}
          />
        </svg>
      </div>

      {/* Footer text */}
      <span>GOTHAM GRID v1.0</span>
      <span className="mx-2">--</span>
      <span>SCANNING THE GRID</span>
      <span className="mx-2">--</span>
      <span>[SYSTEM STATUS: NOMINAL]</span>
    </footer>
  );
}
