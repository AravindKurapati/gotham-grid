'use client';
import { useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import { CITIES, PRIMARY_CITIES, CITY_KEYS } from '@/lib/cities';
import type { CityKey } from '@/lib/types';

interface Props {
  selected: CityKey;
  onChange: (city: CityKey) => void;
}

export default function CitySelector({ selected, onChange }: Props) {
  const { theme } = useTheme();
  const [showOverflow, setShowOverflow] = useState(false);

  const overflowCities = CITY_KEYS.filter(k => !PRIMARY_CITIES.includes(k));
  const isFlap = theme === 'flap';

  const tabBase = 'font-mono text-xs px-2 py-1 border cursor-pointer transition-colors whitespace-nowrap';
  const tabActive = isFlap
    ? 'bg-flap-yellow text-flap-bg border-flap-yellow'
    : 'bg-crt-green text-crt-black border-crt-green';
  const tabInactive = isFlap
    ? 'border-flap-border text-flap-yellow/70 hover:border-flap-yellow hover:text-flap-yellow'
    : 'border-crt-green/40 text-crt-green/70 hover:border-crt-green hover:text-crt-green';

  return (
    <div className="flex flex-wrap gap-1 items-center relative">
      {PRIMARY_CITIES.map(key => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`${tabBase} ${selected === key ? tabActive : tabInactive}`}
        >
          {selected === key ? '[' : ''}{CITIES[key].gridName}{selected === key ? ']' : ''}
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowOverflow(v => !v)}
          className={`${tabBase} ${tabInactive}`}
        >
          [+{overflowCities.length}]
        </button>
        {showOverflow && (
          <div
            className={`absolute top-full left-0 mt-1 z-50 border p-2 min-w-[160px] grid grid-cols-2 gap-1 ${
              isFlap ? 'bg-flap-bg border-flap-border' : 'bg-crt-bg border-crt-green'
            }`}
          >
            {overflowCities.map(key => (
              <button
                key={key}
                onClick={() => { onChange(key); setShowOverflow(false); }}
                className={`${tabBase} ${selected === key ? tabActive : tabInactive} text-left`}
              >
                {CITIES[key].gridName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
