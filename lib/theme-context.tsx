'use client';

export type Theme = 'flap' | 'crt';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  return { theme: 'flap' as Theme, toggleTheme: () => {} };
}
