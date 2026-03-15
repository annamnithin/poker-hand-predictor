'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const NAV_ITEMS = [
  { href: '/hand/new', label: 'Analyze', primary: true },
  { href: '/hands', label: 'History' },
  { href: '/settings', label: 'Settings' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center h-14 gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:bg-emerald-700 transition-colors">
              ♠
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-sm">PokerEdge</span>
              <span className="hidden sm:inline text-xs text-slate-400 ml-1.5 font-normal">Study Tool</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 ml-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  item.primary && pathname !== item.href
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                    : pathname === item.href
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
