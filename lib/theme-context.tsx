'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'flap' | 'crt';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'flap',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'flap';
    const stored = localStorage.getItem('gotham-theme') as Theme | null;
    return stored === 'crt' || stored === 'flap' ? stored : 'flap';
  });

  useEffect(() => {
    document.documentElement.classList.remove('theme-flap', 'theme-crt');
    document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem('gotham-theme', theme);
  }, [theme]);

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
