'use client';
import { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const BOOT_LINES = [
  '[BOOT] Initializing phosphor display......... OK',
  '[BOOT] Loading scanline matrix............... OK',
  '[BOOT] Connecting to search grid............. OK',
  '[BOOT] Calibrating city frequencies.......... OK',
  '[BOOT] Mapping project signals............... OK',
  '[BOOT] System ready.......................... OK',
];

function GothamSkyline({ isExiting }: { isExiting: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 120"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <defs>
        {/* Bat signal spotlight gradient — bright at source, fades to sky */}
        <linearGradient id="batSignal" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.09" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bat signal spotlight cone — apex at top of tallest tower (x=127) */}
      <polygon points="108,2 127,32 146,2" fill="url(#batSignal)" />

      {/* Bat silhouette at apex of signal beam */}
      <g transform="translate(122, 3) scale(0.2)" fill="#1a1a1a">
        <path d="M24,22 L1,18 C3,9 10,7 15,15 Z" />
        <path d="M24,22 L47,18 C45,9 38,7 33,15 Z" />
        <ellipse cx="24" cy="22" rx="9" ry="5" />
        <polygon points="20,17 19,7 22,17" />
        <polygon points="26,17 29,7 28,17" />
      </g>

      {/* ── BUILDING SILHOUETTES (#1a1a1a on #0a0a0a) ── */}

      {/* Building 1 — left edge, mid-height */}
      <rect x="0" y="74" width="18" height="46" fill="#1a1a1a" />

      {/* Building 2 — pointed roof */}
      <rect x="20" y="62" width="14" height="58" fill="#1a1a1a" />
      <polygon points="20,62 27,53 34,62" fill="#1a1a1a" />

      {/* Building 3 — wide, squat */}
      <rect x="36" y="80" width="22" height="40" fill="#1a1a1a" />

      {/* Building 4 — tall skyscraper with stepped top */}
      <rect x="60" y="50" width="16" height="70" fill="#1a1a1a" />
      <rect x="63" y="44" width="10" height="6" fill="#1a1a1a" />
      <rect x="65" y="40" width="6" height="4" fill="#1a1a1a" />

      {/* Building 5 — medium */}
      <rect x="78" y="68" width="20" height="52" fill="#1a1a1a" />
      <rect x="82" y="63" width="12" height="5" fill="#1a1a1a" />

      {/* Building 6 — medium-tall, peaked */}
      <rect x="100" y="54" width="18" height="66" fill="#1a1a1a" />
      <polygon points="100,54 109,46 118,54" fill="#1a1a1a" />

      {/* Building 7 — TALLEST: Gotham Signal Tower (bat signal source) */}
      <rect x="120" y="32" width="14" height="88" fill="#1a1a1a" />
      {/* Antenna */}
      <rect x="125" y="27" width="4" height="5" fill="#1a1a1a" />
      <rect x="126" y="23" width="2" height="4" fill="#1a1a1a" />
      {/* Signal lamp */}
      <circle cx="127" cy="32" r="2" fill="#222222" />

      {/* Building 8 — medium, right of tower */}
      <rect x="136" y="70" width="18" height="50" fill="#1a1a1a" />

      {/* Building 9 — medium-tall */}
      <rect x="156" y="58" width="14" height="62" fill="#1a1a1a" />
      <rect x="159" y="54" width="8" height="4" fill="#1a1a1a" />

      {/* Building 10 */}
      <rect x="172" y="62" width="16" height="58" fill="#1a1a1a" />
      <polygon points="172,62 180,54 188,62" fill="#1a1a1a" />

      {/* Building 11 — right edge */}
      <rect x="190" y="78" width="10" height="42" fill="#1a1a1a" />
    </svg>
  );
}

export default function BootSequence({ onComplete }: Props) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEnter, setShowEnter] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    let lineIdx = 0;
    const lineInterval = setInterval(() => {
      lineIdx++;
      setVisibleLines(lineIdx);
      if (lineIdx >= BOOT_LINES.length) {
        clearInterval(lineInterval);
        setShowProgress(true);
        let p = 0;
        const progInterval = setInterval(() => {
          p += 4;
          setProgress(Math.min(100, p));
          if (p >= 100) {
            clearInterval(progInterval);
            setShowEnter(true);
          }
        }, 30);
      }
    }, 280);

    return () => clearInterval(lineInterval);
  }, [onComplete]);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(onComplete, 450);
  };

  const filled = Math.floor(progress / 5);
  const empty = 20 - filled;

  return (
    <div
      className="min-h-screen bg-crt-black text-crt-green font-mono flex items-center justify-center p-8 relative overflow-hidden"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: isExiting ? 'opacity 0.45s ease-in' : undefined,
      }}
    >
      {/* Gotham skyline + bat signal watermark */}
      <GothamSkyline isExiting={isExiting} />

      {/* Terminal content — sits above the skyline */}
      <div className="max-w-xl w-full relative z-10">
        {/* ASCII box header */}
        <pre className="text-crt-green text-sm mb-4 leading-tight whitespace-pre">{`+================================================+
|           GOTHAM GRID v1.0                     |
|      GLOBAL VIBE-CODE SCANNER                  |
+================================================+`}</pre>

        {/* Boot lines (typewriter) */}
        <div className="space-y-1 text-sm mb-4 min-h-[144px]">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <p key={i} className="text-crt-green animate-scan-fade">{line}</p>
          ))}
          {visibleLines < BOOT_LINES.length && (
            <span className="animate-blink">_</span>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="mb-4 text-sm">
            <p className="mb-1 text-crt-green/70">&gt; LOADING GRID DATA...</p>
            <p className="text-crt-green">
              [{`#`.repeat(filled)}{`.`.repeat(empty)}] {progress}%
            </p>
          </div>
        )}

        {/* Enter button */}
        {showEnter && (
          <button
            onClick={handleEnter}
            className="mt-4 border border-crt-green text-crt-green px-6 py-2 font-mono text-sm hover:bg-crt-green hover:text-crt-black transition-colors cursor-pointer animate-scan-fade"
          >
            [ENTER THE GRID]
          </button>
        )}
      </div>
    </div>
  );
}
