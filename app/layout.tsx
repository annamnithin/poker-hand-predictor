import type { Metadata } from 'next';
import { Navbar } from '@/components/ui/navbar';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: "PokerEdge — Texas Hold'em Hand Analyzer",
    template: "%s | PokerEdge",
  },
  description:
    "Get solver-inspired EV analysis, range-based recommendations, and detailed breakdowns for every Texas Hold'em hand. Built for serious players who want to study smarter.",
  keywords: ['poker', 'hand analyzer', 'EV calculator', 'GTO', 'Texas Holdem', 'poker study', 'range analysis'],
  openGraph: {
    title: "PokerEdge — Texas Hold'em Hand Analyzer",
    description: "Solver-inspired EV analysis and hand review tool for Texas Hold'em players.",
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
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
        <footer className="border-t border-slate-100 mt-16">
          <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span>© 2025 PokerEdge. For educational use only.</span>
            <span>Not affiliated with any poker platform or casino.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
