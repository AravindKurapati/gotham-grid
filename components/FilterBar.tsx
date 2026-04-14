'use client';
import { useTheme } from '@/lib/theme-context';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import type { Category } from '@/lib/types';

interface Props {
  selected: Category | null;
  onSelect: (cat: Category | null) => void;
}

export default function FilterBar({ selected, onSelect }: Props) {
  const { theme } = useTheme();
  const isFlap = theme === 'flap';

  const base = 'font-mono text-xs px-2 py-1 border cursor-pointer transition-colors whitespace-nowrap';
  const allActive = isFlap
    ? 'bg-flap-yellow text-flap-bg border-flap-yellow'
    : 'bg-crt-green text-crt-black border-crt-green';
  const allInactive = isFlap
    ? 'border-flap-border text-flap-yellow/70 hover:border-flap-yellow'
    : 'border-crt-green/40 text-crt-green/70 hover:border-crt-green';

  return (
    <div className="flex flex-wrap gap-1">
      <button
        onClick={() => onSelect(null)}
        className={`${base} ${selected === null ? allActive : allInactive}`}
      >
        [ALL]
      </button>
      {CATEGORY_KEYS.map(cat => {
        const isActive = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(isActive ? null : cat)}
            style={isActive ? { borderColor: CATEGORIES[cat].color, color: CATEGORIES[cat].color } : {}}
            className={`${base} ${isActive ? 'opacity-100' : allInactive}`}
          >
            {CATEGORIES[cat].tag} {cat}
          </button>
        );
      })}
    </div>
  );
}
