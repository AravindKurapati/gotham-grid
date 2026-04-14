'use client';
import { useTheme } from '@/lib/theme-context';

export default function ScanlineOverlay() {
  const { theme } = useTheme();
  if (theme !== 'crt') return null;
  return <div className="scanlines pointer-events-none fixed inset-0 z-[9998]" />;
}
