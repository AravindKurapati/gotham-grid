'use client';
import { useTheme } from '@/lib/theme-context';

interface Props {
  city?: string;
  lines?: string[];
  error?: string | null;
}

export default function LoadingTerminal({ city, lines, error }: Props) {
  const { theme } = useTheme();
  const textColor = theme === 'crt' ? 'text-crt-green' : 'text-flap-yellow';

  if (error) {
    return (
      <div className={`font-mono text-sm py-8 text-crt-red`}>
        <p>[ERR] {error}</p>
        <p className="mt-1 opacity-60">[ERR] TRY AGAIN LATER</p>
      </div>
    );
  }

  const defaultLines = city
    ? [
        `> SCANNING GOTHAM GRID: ${city}...`,
        '> QUERYING SEARCH NETWORK..............',
        '> PARSING PROJECT SIGNALS..............',
        '> RENDERING GRID.......................',
      ]
    : (lines ?? ['> LOADING...']);

  return (
    <div className={`font-mono text-sm py-8 ${textColor}`}>
      {defaultLines.map((line, i) => (
        <p key={i} className="animate-scan-fade" style={{ animationDelay: `${i * 0.15}s` }}>
          {line}
        </p>
      ))}
    </div>
  );
}
