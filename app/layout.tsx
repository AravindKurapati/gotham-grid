import type { Metadata } from 'next';
import { VT323, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-context';

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GOTHAM GRID -- Global Vibe-Code Scanner',
  description:
    'The Bloomberg Terminal of vibe-coding culture. Scanning creative projects from NYC, London, Tokyo, and cities worldwide.',
  openGraph: {
    title: 'GOTHAM GRID',
    description: 'Scanning the grid. Tracking the vibe.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${vt323.variable} ${ibmPlexMono.variable}`}>
      <body style={{ background: '#1a1a1a', color: '#f0e68c' }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
