'use client';
import { useTheme } from '@/lib/theme-context';

interface Props {
  city: string;
}

export default function AgentStatus({ city }: Props) {
  const { theme } = useTheme();
  const color = theme === 'crt' ? 'text-crt-green' : 'text-flap-yellow';

  return (
    <div className={`font-mono text-sm py-8 ${color}`}>
      <p>&gt; LIVE SCAN INITIATED: {city.toUpperCase()}</p>
      <p className="mt-1 opacity-80">
        &gt; QUERYING SEARCH NETWORK
        <span className="animate-blink ml-1">_</span>
      </p>
      <p className="mt-1 opacity-60">&gt; PARSING PROJECT SIGNALS...</p>
    </div>
  );
}
