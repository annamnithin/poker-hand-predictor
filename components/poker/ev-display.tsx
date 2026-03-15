'use client';

import type { EVResult } from '@/lib/domain/types';
import { cn } from '@/lib/utils/cn';

interface EVDisplayProps {
  ev: EVResult;
}

type ActionConfig = {
  key: EVResult['bestAction'];
  label: string;
  evValue: number;
  bestClass: string;
  labelClass: string;
};

export function EVDisplay({ ev }: EVDisplayProps) {
  const facingBet = ev.evCall !== 0 || ev.evRaise !== 0;

  // Show relevant actions depending on context
  const actions: ActionConfig[] = facingBet
    ? [
        { key: 'fold',  label: 'Fold',  evValue: ev.evFold,  bestClass: 'border-red-400 bg-red-50 ring-2 ring-red-200',     labelClass: 'bg-red-100 text-red-700' },
        { key: 'call',  label: 'Call',  evValue: ev.evCall,  bestClass: 'border-blue-400 bg-blue-50 ring-2 ring-blue-200',   labelClass: 'bg-blue-100 text-blue-700' },
        { key: 'raise', label: 'Raise', evValue: ev.evRaise, bestClass: 'border-violet-400 bg-violet-50 ring-2 ring-violet-200', labelClass: 'bg-violet-100 text-violet-700' },
      ]
    : [
        { key: 'check', label: 'Check', evValue: ev.evCheck, bestClass: 'border-slate-400 bg-slate-50 ring-2 ring-slate-200', labelClass: 'bg-slate-200 text-slate-700' },
        { key: 'bet',   label: 'Bet',   evValue: ev.evBet,   bestClass: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200', labelClass: 'bg-emerald-100 text-emerald-700' },
      ];

  return (
    <div className={cn('grid gap-3', facingBet ? 'grid-cols-3' : 'grid-cols-2')}>
      {actions.map(({ key, label, evValue, bestClass, labelClass }) => {
        const isBest = key === ev.bestAction;
        return (
          <div
            key={key}
            className={cn(
              'rounded-xl p-4 text-center border-2 transition-all',
              isBest ? bestClass + ' shadow-md' : 'border-slate-200 bg-white',
            )}
          >
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              {label}
            </div>
            <div className={cn(
              'text-2xl font-bold tabular-nums',
              evValue > 0 ? 'text-emerald-700' : evValue < 0 ? 'text-red-600' : 'text-slate-500'
            )}>
              {evValue > 0 ? '+' : ''}{evValue.toFixed(2)}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">BB EV</div>
            {isBest && (
              <span className={cn('mt-2 text-xs font-bold px-2.5 py-0.5 rounded-full inline-block', labelClass)}>
                BEST
              </span>
            )}
            {/* Sizing hint */}
            {isBest && key === 'raise' && ev.bestRaiseFraction && (
              <div className="text-xs text-slate-500 mt-1">
                {Math.round(ev.bestRaiseFraction * 100)}% pot
              </div>
            )}
            {isBest && key === 'bet' && ev.bestBetFraction && (
              <div className="text-xs text-slate-500 mt-1">
                {Math.round(ev.bestBetFraction * 100)}% pot
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
