'use client';
import { useTheme } from '@/lib/theme-context';
import type { Project } from '@/lib/types';

interface Props {
  projects: Project[];
}

export default function Ticker({ projects }: Props) {
  const { theme } = useTheme();
  if (projects.length === 0) return null;

  const bgColor = theme === 'crt'
    ? 'bg-crt-green text-crt-black'
    : 'bg-flap-border text-flap-yellow';

  const items = projects.slice(0, 20);
  const text = items
    .map(p => `[+] ${p.title.toUpperCase()} -- ${p.author}`)
    .join('   ');

  return (
    <div className={`${bgColor} overflow-hidden whitespace-nowrap font-mono text-xs py-1 mt-4`}>
      <span className="inline-block animate-ticker">{text}</span>
    </div>
  );
}
