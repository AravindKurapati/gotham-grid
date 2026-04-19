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
    color: '#4a7828',
    points: '0,73 28,73 45,63 60,63 78,47 94,47 118,36 141,36 161,28 190,28 216,16 240,16',
    delay: '0s',
  },
  {
    id: 'c',
    color: '#2a6e58',
    points: '0,39 25,39 45,45 64,45 80,59 105,59 122,65 143,65 165,79 190,79 220,96 240,96',
    delay: '0.7s',
  },
  {
    id: 'q',
    color: '#6a6e2a',
    points: '0,19 30,19 43,31 60,31 79,52 96,52 122,42 149,42 178,56 207,56 240,68',
    delay: '1.2s',
  },
  {
    id: 'r',
    color: '#7a3825',
    points: '44,0 44,19 57,32 70,49 82,66 96,84 112,101 140,101 169,111 210,111 240,116',
    delay: '1.8s',
  },
  {
    id: 'g',
    color: '#2e5f7a',
    points: '0,54 31,54 47,59 66,59 85,71 106,71 130,82 155,82 184,83 209,93 240,93',
    delay: '2.4s',
  },
  {
    id: 'n',
    color: '#556828',
    points: '105,0 105,20 122,38 122,57 136,73 136,94 151,120',
    delay: '2.9s',
  },
  {
    id: 'l',
    color: '#505050',
    points: '0,88 20,88 40,87 62,87 82,89 105,92 128,96 152,100 176,104 200,107 230,110 240,111',
    delay: '3.4s',
  },
  {
    id: '7',
    color: '#5a2878',
    points: '22,48 42,44 65,38 88,32 112,26 138,20 162,14 188,8 215,4 240,2',
    delay: '3.9s',
  },
  {
    id: 'j',
    color: '#7a5018',
    points: '0,108 22,106 45,102 68,98 92,101 115,106 138,111 162,115 188,117 215,119 240,120',
    delay: '4.4s',
  },
  {
    id: 'f',
    color: '#7a3c14',
    points: '0,65 22,65 44,68 66,72 88,78 110,85 133,90 157,94 182,98 208,102 240,106',
    delay: '4.9s',
  },
  {
    id: 'b',
    color: '#6a2416',
    points: '0,28 18,26 38,22 58,20 78,28 98,38 118,52 135,64 150,76 166,86 182,94 200,100 220,106 240,109',
    delay: '5.4s',
  },
] as const;

const STATIONS = [
  // original lines
  [30, 19], [44, 19], [57, 32], [60, 31], [64, 45], [78, 47], [79, 52],
  [80, 59], [85, 71], [94, 47], [96, 52], [96, 84], [105, 20], [105, 59],
  [118, 36], [122, 38], [122, 57], [122, 65], [130, 82], [136, 73],
  [141, 36], [143, 65], [149, 42], [155, 82], [161, 28], [165, 79],
  [178, 56], [190, 28], [190, 79], [207, 56], [209, 93], [216, 16],
  // L line
  [20, 88], [40, 87], [62, 87], [82, 89], [105, 92], [128, 96], [152, 100], [176, 104], [200, 107],
  // 7 line
  [42, 44], [65, 38], [88, 32], [112, 26], [138, 20], [162, 14], [188, 8],
  // J/Z line
  [22, 106], [45, 102], [68, 98], [92, 101], [115, 106], [138, 111], [162, 115], [188, 117],
  // F line
  [22, 65], [44, 68], [66, 72], [88, 78], [110, 85], [133, 90], [157, 94], [182, 98], [208, 102],
  // B/D line
  [18, 26], [38, 22], [58, 20], [78, 28], [98, 38], [118, 52], [135, 64], [150, 76], [166, 86], [182, 94], [200, 100],
] as const;

const BOROUGH_LABELS = [
  { label: 'MANHATTAN', x: 74, y: 30 },
  { label: 'QUEENS', x: 178, y: 31 },
  { label: 'BRONX', x: 191, y: 57 },
  { label: 'BROOKLYN', x: 194, y: 88 },
  { label: 'STATEN ISLAND', x: 199, y: 108 },
] as const;

const DATA_MARKS = [
  { text: 'x12.5', x: 17, y: 103 },
  { text: 'y09.2', x: 18, y: 108 },
  { text: 'A-22c', x: 0, y: 12 },
  { text: 'MN.774', x: 135, y: 12 },
  { text: 'BX:SCAN', x: 206, y: 78 },
  { text: 'QNS-118', x: 202, y: 36 },
] as const;

function routePath(points: string) {
  return `M${points.replaceAll(' ', ' L')}`;
}

function MtaSchematicBackground({ isExiting }: { isExiting: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 120"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <defs>
        <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.45" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softBloom" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="fineGrid" width="4" height="4" patternUnits="userSpaceOnUse">
          <path
            d="M 4 0 L 0 0 0 4"
            fill="none"
            stroke="#33ff33"
            strokeOpacity="0.13"
            strokeWidth="0.18"
          />
        </pattern>
        <pattern id="dotMatrix" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
          <circle cx="0.45" cy="0.45" r="0.12" fill="#33ff33" fillOpacity="0.10" />
        </pattern>
      </defs>

      <rect width="240" height="120" fill="#050807" />
      <rect width="240" height="120" fill="url(#fineGrid)" />
      <rect width="240" height="120" fill="url(#dotMatrix)" opacity="1" />
      <path
        d="M0 23 H240 M0 50 H240 M0 76 H240 M0 102 H240 M22 0 V120 M66 0 V120 M110 0 V120 M154 0 V120 M198 0 V120"
        stroke="#55ff66"
        strokeOpacity="0.14"
        strokeWidth="0.35"
      />

      {DATA_MARKS.map(mark => (
        <text
          key={`${mark.text}-${mark.x}`}
          x={mark.x}
          y={mark.y}
          fill="#a8ff9a"
          fillOpacity="0.15"
          fontSize="1.8"
          fontFamily="monospace"
          letterSpacing="0"
        >
          {mark.text}
        </text>
      ))}

      <g opacity="0.28">
        {Array.from({ length: 18 }).map((_, index) => (
          <path
            key={index}
            d={`M${index * 14 - 20} ${10 + (index % 4) * 17} H${index * 14 + 62}`}
            stroke="#95f06d"
            strokeDasharray="0.7 1.5"
            strokeWidth="0.22"
          />
        ))}
      </g>

      {BOROUGH_LABELS.map(({ label, x, y }) => (
        <text
          key={label}
          x={x}
          y={y}
          fill="#b7ffd2"
          fillOpacity="0.35"
          fontSize="2.2"
          fontFamily="monospace"
          fontWeight="700"
          letterSpacing="0.5"
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
              strokeOpacity="0.55"
              strokeWidth="0.45"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={route.points}
              fill="none"
              stroke="#eaffde"
              strokeOpacity="0.28"
              strokeWidth="0.14"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1 2.4"
            />
            <circle r="1" fill={route.color} opacity="0.95" filter="url(#softBloom)">
              <animateMotion
                dur="6.2s"
                begin={route.delay}
                repeatCount="indefinite"
                path={routePath(route.points)}
              />
              <animate
                attributeName="opacity"
                values="0;0.9;0.9;0"
                dur="6.2s"
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
            r="0.55"
            fill="#07100a"
            stroke="#caffbf"
            strokeOpacity="0.35"
            strokeWidth="0.25"
          />
        ))}
      </g>

      {ROUTES.map((route, index) => (
        <g key={`${route.id}-badge`} transform={`translate(${8 + index * 20} 116)`}>
          <circle r="3" fill={route.color} fillOpacity="0.78" />
          <text
            y="1"
            fill="#061006"
            fontSize="3"
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
      className="min-h-screen bg-crt-black text-crt-green font-mono flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: isExiting ? 'opacity 0.45s ease-in' : undefined,
      }}
    >
      <MtaSchematicBackground isExiting={isExiting} />

      <div
        className="relative z-10"
        style={{
          width: 'fit-content',
          maxWidth: '560px',
          background: 'rgba(10,10,10,0.85)',
          border: '1px solid rgba(51,255,51,0.30)',
          padding: '1.25rem 1.5rem',
        }}
      >
        <pre className="text-crt-green text-[13px] mb-4 leading-tight whitespace-pre glow-green">{`+================================================+
|           GOTHAM GRID v1.0                     |
|      GLOBAL VIBE-CODE SCANNER                  |
+================================================+`}</pre>

        <div className="space-y-1 text-[13px] mb-4 min-h-[120px]">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <p key={i} className="text-crt-green animate-scan-fade glow-green whitespace-nowrap">{line}</p>
          ))}
          {visibleLines < BOOT_LINES.length && (
            <span className="animate-blink">_</span>
          )}
        </div>

        {showProgress && (
          <div className="mb-4 text-[13px]">
            <p className="mb-1 text-crt-green/80 whitespace-nowrap">&gt; LOADING GRID DATA...</p>
            <p className="text-crt-green glow-green whitespace-nowrap">
              [{`#`.repeat(filled)}{`.`.repeat(empty)}] {progress}%
            </p>
          </div>
        )}

        {showEnter && (
          <button
            onClick={handleEnter}
            className="mt-2 ml-24 border border-crt-green text-crt-green px-8 py-2 font-mono text-base hover:bg-crt-green hover:text-crt-black transition-colors cursor-pointer animate-scan-fade"
          >
            [ENTER THE GRID]
          </button>
        )}
      </div>
    </div>
  );
}
