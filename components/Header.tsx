'use client';
import { useTheme } from '@/lib/theme-context';
import CitySelector from './CitySelector';
import ThemeToggle from './ThemeToggle';
import type { CityKey } from '@/lib/types';

interface Props {
  selectedCity: CityKey;
  onCityChange: (city: CityKey) => void;
  scanCount: number;
  freeScanLimit: number;
  onScanRequest: () => void;
  isScanning: boolean;
}

export default function Header({
  selectedCity, onCityChange, scanCount, freeScanLimit, onScanRequest, isScanning,
}: Props) {
  const { theme } = useTheme();
  const isFlap = theme === 'flap';

  const border = isFlap ? 'border-flap-border' : 'border-crt-green/30';
  const titleCls = isFlap ? 'text-flap-yellow' : 'text-crt-green glow-green';
  const subCls = isFlap ? 'text-flap-yellow/50' : 'text-crt-green/60';
  const scanBtn = isFlap
    ? 'border-crt-amber text-crt-amber hover:bg-crt-amber/10'
    : 'border-crt-green text-crt-green hover:bg-crt-green/10';

  const remaining = Math.max(0, freeScanLimit - scanCount);
  const scanLabel = scanCount < freeScanLimit
    ? `[+] LIVE SCAN (${remaining}/${freeScanLimit})`
    : '[+] LIVE SCAN (CODE REQ)';

  return (
    <header className={`border-b ${border} pb-3 mb-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <h1 className={`font-display text-3xl md:text-4xl tracking-widest ${titleCls} flex items-center gap-2`}>
            {/* Bat-wing GG monogram */}
            <svg
              viewBox="0 0 48 28"
              width="38"
              height="22"
              aria-hidden="true"
              style={{ display: 'inline-block', flexShrink: 0 }}
            >
              <rect width="48" height="28" fill="#0a0a0a" />
              {/* Left wing */}
              <path fill="currentColor" d="M24,22 L1,18 C3,9 10,7 15,15 Z" />
              {/* Right wing */}
              <path fill="currentColor" d="M24,22 L47,18 C45,9 38,7 33,15 Z" />
              {/* Body */}
              <ellipse cx="24" cy="22" rx="9" ry="5" fill="currentColor" />
              {/* Left ear */}
              <polygon points="20,17 19,7 22,17" fill="currentColor" />
              {/* Right ear */}
              <polygon points="26,17 29,7 28,17" fill="currentColor" />
              {/* GG monogram — black on colored body */}
              <text
                x="24"
                y="25"
                textAnchor="middle"
                fill="#0a0a0a"
                fontSize="7"
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="0"
              >
                GG
              </text>
            </svg>
            GOTHAM GRID
          </h1>
          <p className={`font-mono text-xs ${subCls}`}>
            Scanning the grid. Tracking the vibe.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ThemeToggle />
          <button
            onClick={isScanning ? undefined : onScanRequest}
            disabled={isScanning}
            className={`font-mono text-xs px-3 py-1 border cursor-pointer transition-colors ${scanBtn} ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isScanning ? '[...SCANNING]' : scanLabel}
          </button>
        </div>
      </div>
      <CitySelector selected={selectedCity} onChange={onCityChange} />
    </header>
  );
}
