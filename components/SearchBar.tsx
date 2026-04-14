'use client';
import { useTheme } from '@/lib/theme-context';
import { useEffect, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  const { theme } = useTheme();
  const [local, setLocal] = useState(value);
  const isFlap = theme === 'flap';

  useEffect(() => {
    const t = setTimeout(() => onChange(local), 500);
    return () => clearTimeout(t);
  }, [local, onChange]);

  const borderCls = isFlap
    ? 'border-flap-border focus-within:border-flap-yellow'
    : 'border-crt-green/40 focus-within:border-crt-green';
  const textCls = isFlap
    ? 'text-flap-yellow placeholder-flap-yellow/40'
    : 'text-crt-green placeholder-crt-green/40';
  const bgCls = isFlap ? 'bg-flap-bg' : 'bg-crt-black';
  const dimCls = isFlap ? 'text-flap-yellow/50' : 'text-crt-green/60';

  return (
    <div className={`flex items-center border ${borderCls} px-3 py-2 flex-1 transition-colors`}>
      <span className={`font-mono text-sm mr-2 ${dimCls}`}>&gt;</span>
      <input
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        placeholder="SEARCH THE GRID..."
        className={`flex-1 font-mono text-sm ${bgCls} ${textCls} outline-none`}
        spellCheck={false}
      />
      {local && (
        <button
          onClick={() => { setLocal(''); onChange(''); }}
          className={`font-mono text-xs ml-2 ${dimCls} hover:opacity-100`}
        >
          [X]
        </button>
      )}
      <span className={`font-mono text-sm ml-1 animate-blink ${isFlap ? 'text-flap-yellow' : 'text-crt-green'}`}>
        _
      </span>
    </div>
  );
}
