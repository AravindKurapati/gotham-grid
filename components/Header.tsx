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
          <h1 className={`font-display text-3xl md:text-4xl tracking-widest ${titleCls}`}>
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
