'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'flap' | 'crt';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'flap',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('flap');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('gotham-theme') as Theme | null;
    if (stored === 'crt' || stored === 'flap') setTheme(stored);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.remove('theme-flap', 'theme-crt');
    document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem('gotham-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => setTheme(t => (t === 'flap' ? 'crt' : 'flap'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
