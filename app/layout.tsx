import type { Metadata } from 'next';
import { Navbar } from '@/components/ui/navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Solver Study — Texas Hold\'em Hand Review',
  description: 'A study/review tool for Texas Hold\'em cash game hands with solver-inspired recommendations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-slate-50 text-slate-900 antialiased"
        style={{
          '--font-display': '"DM Sans", system-ui',
          '--font-body': '"DM Sans", system-ui',
          '--font-mono': '"JetBrains Mono", monospace',
        } as React.CSSProperties}
      >
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
