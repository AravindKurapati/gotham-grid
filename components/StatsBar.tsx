'use client';
import { useMemo, useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import { CITIES } from '@/lib/cities';
import type { Project, CityKey } from '@/lib/types';

interface Props { projects: Project[]; selectedCity: CityKey; }

export default function StatsBar({ projects, selectedCity }: Props) {
  const { theme } = useTheme();
  const isFlap = theme === 'flap';

  const cardBorder = isFlap ? 'border-flap-border' : 'border-crt-green/30';
  const labelCls = isFlap ? 'text-flap-yellow/50' : 'text-crt-green/60';
  const valueCls = isFlap ? 'text-flap-yellow' : 'text-crt-green';

  const total = projects.length;
  const [weekAgo] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = projects.filter(p => {
    try { return new Date(p.date).getTime() > weekAgo; } catch { return false; }
  }).length;

  const catCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '--';

  const stats = [
    { label: 'PROJECTS', value: String(total) },
    { label: 'THIS WEEK', value: thisWeek > 0 ? String(thisWeek) : '--' },
    { label: 'TOP CAT', value: topCat },
    { label: 'CITY', value: CITIES[selectedCity].gridName },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-3">
      {stats.map(s => (
        <div key={s.label} className={`border ${cardBorder} px-3 py-2`}>
          <div className={`font-mono text-xs ${labelCls} mb-1`}>{s.label}</div>
          <div className={`font-display text-2xl ${valueCls}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
