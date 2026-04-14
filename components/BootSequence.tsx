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

export default function BootSequence({ onComplete }: Props) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEnter, setShowEnter] = useState(false);

  useEffect(() => {
    // Skip animation for users who prefer reduced motion
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

  const filled = Math.floor(progress / 5);
  const empty = 20 - filled;

  return (
    <div className="min-h-screen bg-crt-black text-crt-green font-mono flex items-center justify-center p-8">
      <div className="max-w-xl w-full">
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
            onClick={onComplete}
            className="mt-4 border border-crt-green text-crt-green px-6 py-2 font-mono text-sm hover:bg-crt-green hover:text-crt-black transition-colors cursor-pointer animate-scan-fade"
          >
            [ENTER THE GRID]
          </button>
        )}
      </div>
    </div>
  );
}
