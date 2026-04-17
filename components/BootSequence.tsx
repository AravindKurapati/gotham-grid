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

const ROUTES = [
  {
    id: 'a',
    color: '#33ff33',
    points: '3,92 28,76 55,82 78,61 105,66 130,45 158,50 197,26',
    delay: '0s',
  },
  {
    id: 'c',
    color: '#66ccff',
    points: '0,35 22,42 43,38 70,52 96,46 122,64 146,58 176,78 200,73',
    delay: '0.6s',
  },
  {
    id: 'q',
    color: '#ffcc66',
    points: '12,108 38,92 64,95 86,78 103,85 126,70 150,72 183,96',
    delay: '1.1s',
  },
  {
    id: 'r',
    color: '#ff6666',
    points: '30,8 47,27 62,32 75,48 88,58 104,77 119,84 138,107',
    delay: '1.7s',
  },
  {
    id: 'g',
    color: '#cc99ff',
    points: '118,6 112,25 124,41 119,56 132,70 128,90 140,118',
    delay: '2.2s',
  },
] as const;

const STATIONS = [
  [28, 76],
  [55, 82],
  [78, 61],
  [105, 66],
  [130, 45],
  [158, 50],
  [22, 42],
  [70, 52],
  [122, 64],
  [176, 78],
  [38, 92],
  [86, 78],
  [150, 72],
  [47, 27],
  [75, 48],
  [104, 77],
  [119, 84],
  [112, 25],
  [124, 41],
  [128, 90],
] as const;

const BOROUGH_LABELS = [
  { label: 'MANHATTAN', x: 73, y: 34 },
  { label: 'BROOKLYN', x: 105, y: 93 },
  { label: 'QUEENS', x: 153, y: 35 },
  { label: 'BRONX', x: 111, y: 16 },
  { label: 'STATEN ISLAND', x: 34, y: 101 },
] as const;

const DATA_COLUMNS = [
  { text: '01 A7 QN GRID', x: 13, y: 16 },
  { text: 'BKLYN NODE 33', x: 169, y: 12 },
  { text: 'BX 4D SCAN', x: 141, y: 88 },
  { text: 'MN LOCAL 09', x: 57, y: 12 },
  { text: 'SI RELAY 5', x: 23, y: 54 },
] as const;

function routePath(points: string) {
  return `M${points.replaceAll(' ', ' L')}`;
}

function MtaSchematicBackground({ isExiting }: { isExiting: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 120"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <defs>
        <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="schematicGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path
            d="M 10 0 L 0 0 0 10"
            fill="none"
            stroke="#33ff33"
            strokeOpacity="0.12"
            strokeWidth="0.25"
          />
        </pattern>
      </defs>

      <rect width="200" height="120" fill="url(#schematicGrid)" />
      <path
        d="M0 22 H200 M0 58 H200 M0 96 H200 M34 0 V120 M82 0 V120 M132 0 V120 M178 0 V120"
        stroke="#33ff33"
        strokeOpacity="0.08"
        strokeWidth="0.35"
      />

      {DATA_COLUMNS.map(column => (
        <text
          key={column.text}
          x={column.x}
          y={column.y}
          fill="#33ff33"
          fillOpacity="0.23"
          fontSize="2.7"
          fontFamily="monospace"
          letterSpacing="0"
          transform={`rotate(90 ${column.x} ${column.y})`}
        >
          {column.text}
          <animate
            attributeName="fill-opacity"
            values="0.08;0.36;0.12"
            dur="3.4s"
            begin={`${column.x / 50}s`}
            repeatCount="indefinite"
          />
        </text>
      ))}

      {BOROUGH_LABELS.map(({ label, x, y }) => (
        <text
          key={label}
          x={x}
          y={y}
          fill="#33ff33"
          fillOpacity="0.22"
          fontSize="5"
          fontFamily="monospace"
          fontWeight="700"
          letterSpacing="0"
          textAnchor="middle"
        >
          {label}
        </text>
      ))}

      <g filter="url(#routeGlow)">
        {ROUTES.map(route => (
          <g key={route.id}>
            <polyline
              points={route.points}
              fill="none"
              stroke={route.color}
              strokeOpacity="0.58"
              strokeWidth="1.15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={route.points}
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.38"
              strokeWidth="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1.2 3"
            />
            <circle r="1.8" fill={route.color} opacity="0.95">
              <animateMotion
                dur="4.8s"
                begin={route.delay}
                repeatCount="indefinite"
                path={routePath(route.points)}
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                dur="4.8s"
                begin={route.delay}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
      </g>

      <g>
        {STATIONS.map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="1.5"
            fill="#0a0a0a"
            stroke="#f7fff7"
            strokeOpacity="0.78"
            strokeWidth="0.65"
          />
        ))}
      </g>

      {ROUTES.map((route, index) => (
        <g key={`${route.id}-badge`} transform={`translate(${156 + index * 9} 112)`}>
          <circle r="3.5" fill={route.color} fillOpacity="0.85" />
          <text
            y="1.2"
            fill="#0a0a0a"
            fontSize="3.6"
            fontFamily="monospace"
            fontWeight="700"
            textAnchor="middle"
          >
            {route.id.toUpperCase()}
          </text>
        </g>
      ))}
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
      <MtaSchematicBackground isExiting={isExiting} />

      <div className="max-w-xl w-full relative z-10">
        <pre className="text-crt-green text-sm mb-4 leading-tight whitespace-pre">{`+================================================+
|           GOTHAM GRID v1.0                     |
|      GLOBAL VIBE-CODE SCANNER                  |
+================================================+`}</pre>

        <div className="space-y-1 text-sm mb-4 min-h-[144px]">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <p key={i} className="text-crt-green animate-scan-fade">{line}</p>
          ))}
          {visibleLines < BOOT_LINES.length && (
            <span className="animate-blink">_</span>
          )}
        </div>

        {showProgress && (
          <div className="mb-4 text-sm">
            <p className="mb-1 text-crt-green/70">&gt; LOADING GRID DATA...</p>
            <p className="text-crt-green">
              [{`#`.repeat(filled)}{`.`.repeat(empty)}] {progress}%
            </p>
          </div>
        )}

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
