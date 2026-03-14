'use client';

import { cn } from '@/lib/utils/cn';

interface ConfidenceMeterProps {
  value: number; // 0-100
}

export function ConfidenceMeter({ value }: ConfidenceMeterProps) {
  const getColor = (v: number) => {
    if (v >= 75) return 'bg-emerald-500';
    if (v >= 50) return 'bg-amber-500';
    if (v >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLabel = (v: number) => {
    if (v >= 75) return 'High';
    if (v >= 50) return 'Moderate';
    if (v >= 25) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Confidence</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {value}% — {getLabel(value)}
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
