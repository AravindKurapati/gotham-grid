'use client';
import { useTheme } from '@/lib/theme-context';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const base = 'font-mono text-xs px-2 py-1 border cursor-pointer transition-colors';
  const active = theme === 'flap'
    ? 'border-flap-yellow text-flap-yellow hover:bg-flap-border'
    : 'border-crt-green text-crt-green hover:bg-crt-green-dark';

  return (
    <button onClick={toggleTheme} className={`${base} ${active}`} title="Toggle theme">
      [{theme === 'flap' ? 'FLAP' : 'CRT'} / {theme === 'flap' ? 'CRT' : 'FLAP'}]
    </button>
  );
}
