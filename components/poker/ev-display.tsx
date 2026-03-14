'use client';

import type { EVResult } from '@/lib/domain/types';
import { cn } from '@/lib/utils/cn';

interface EVDisplayProps {
  ev: EVResult;
}

export function EVDisplay({ ev }: EVDisplayProps) {
  const actions = [
    { key: 'fold', label: 'Fold', value: ev.evFold, color: 'red' },
    { key: 'call', label: 'Call', value: ev.evCall, color: 'blue' },
    { key: 'raise', label: 'Raise', value: ev.evRaise, color: 'emerald' },
  ] as const;

  const maxEv = Math.max(ev.evFold, ev.evCall, ev.evRaise);

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map(({ key, label, value, color }) => {
        const isBest = key === ev.bestAction;
        return (
          <div
            key={key}
            className={cn(
              'rounded-xl p-4 text-center border-2 transition-all',
              isBest
                ? `border-${color}-400 bg-${color}-50 shadow-md ring-2 ring-${color}-200`
                : 'border-slate-200 bg-white',
              // Fallback classes since Tailwind needs static strings
              isBest && key === 'fold' && 'border-red-400 bg-red-50 shadow-md ring-2 ring-red-200',
              isBest && key === 'call' && 'border-blue-400 bg-blue-50 shadow-md ring-2 ring-blue-200',
              isBest && key === 'raise' && 'border-emerald-400 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
            )}
          >
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              {label}
            </div>
            <div
              className={cn(
                'text-2xl font-bold tabular-nums',
                value > 0 ? 'text-emerald-700' : value < 0 ? 'text-red-600' : 'text-slate-500'
              )}
            >
              {value > 0 ? '+' : ''}{value.toFixed(1)}
            </div>
            <div className="text-xs text-slate-400 mt-1">BB EV</div>
            {isBest && (
              <div className={cn(
                'mt-2 text-xs font-semibold px-2 py-0.5 rounded-full inline-block',
                key === 'fold' && 'bg-red-100 text-red-700',
                key === 'call' && 'bg-blue-100 text-blue-700',
                key === 'raise' && 'bg-emerald-100 text-emerald-700'
              )}>
                BEST
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
