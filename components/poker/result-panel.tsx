'use client';

import type { RecommendationResult, HandScenarioInput } from '@/lib/domain/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EVDisplay } from './ev-display';
import { ConfidenceMeter } from './confidence-meter';
import { formatCard } from '@/lib/utils/card-display';
import { cn } from '@/lib/utils/cn';

interface ResultPanelProps {
  result: RecommendationResult;
  input: HandScenarioInput;
  onSave?: () => void;
  saving?: boolean;
}

export function ResultPanel({ result, input, onSave, saving }: ResultPanelProps) {
  const { ev, confidence, explanation, breakdown } = result;

  return (
    <div className="space-y-5">
      {/* Headline recommendation */}
      <Card className="overflow-hidden">
        <div className={cn(
          'px-6 py-4 text-center',
          ev.bestAction === 'fold' && 'bg-gradient-to-r from-red-500 to-red-600',
          ev.bestAction === 'call' && 'bg-gradient-to-r from-blue-500 to-blue-600',
          ev.bestAction === 'raise' && 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        )}>
          <div className="text-white/80 text-sm font-medium uppercase tracking-wider">
            Recommended Action
          </div>
          <div className="text-white text-3xl font-bold capitalize mt-1">
            {ev.bestAction}
            {ev.bestAction === 'raise' && ev.bestRaiseFraction && (
              <span className="text-lg font-normal ml-2 opacity-80">
                ({Math.round(ev.bestRaiseFraction * 100)}% pot = {ev.bestRaiseSizing?.toFixed(1)} BB)
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* EV Breakdown cards */}
      <EVDisplay ev={ev} />

      {/* Confidence */}
      <Card>
        <CardContent className="pt-5">
          <ConfidenceMeter value={confidence} />
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
        </CardContent>
      </Card>

      {/* Detailed breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">Pot Odds</span>
              <span className="font-semibold text-slate-800">{breakdown.potOdds}%</span>
            </div>
            <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">Hero Equity</span>
              <span className="font-semibold text-slate-800">{breakdown.heroEquity}%</span>
            </div>
            <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">Eq. Realization</span>
              <span className="font-semibold text-slate-800">
                {(breakdown.equityRealizationFactor * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">Fold Equity</span>
              <span className="font-semibold text-slate-800">{breakdown.foldEquity}%</span>
            </div>
          </div>

          {/* Villain range label */}
          <div className="mt-3 text-sm">
            <span className="text-slate-500">Villain Range: </span>
            <span className="font-medium text-slate-700">{breakdown.villainContinueRange}</span>
          </div>

          {/* Notes */}
          {breakdown.notes.length > 0 && (
            <div className="mt-3 space-y-1">
              {breakdown.notes.map((note, i) => (
                <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                  {note}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenario snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1.5 text-slate-600">
            <p>
              <span className="text-slate-500">Street:</span>{' '}
              <span className="font-medium capitalize">{input.street}</span>
            </p>
            <p>
              <span className="text-slate-500">Hero Cards:</span>{' '}
              <span className="font-medium font-mono">
                {input.heroCards.map(formatCard).join(' ')}
              </span>
            </p>
            {input.boardCards.length > 0 && (
              <p>
                <span className="text-slate-500">Board:</span>{' '}
                <span className="font-medium font-mono">
                  {input.boardCards.map(formatCard).join(' ')}
                </span>
              </p>
            )}
            <p>
              <span className="text-slate-500">Position:</span>{' '}
              <span className="font-medium">{input.heroPosition}</span>
            </p>
            <p>
              <span className="text-slate-500">Pot:</span>{' '}
              <span className="font-medium">{input.potSize}</span>
              {input.amountToCall > 0 && (
                <span className="ml-2 text-slate-400">| To call: {input.amountToCall}</span>
              )}
            </p>
            <p>
              <span className="text-slate-500">Stacks:</span>{' '}
              <span className="font-medium">Hero {input.heroStack} / Villain {input.villainStack}</span>
            </p>
            {input.opponents.length === 1 ? (
              <p>
                <span className="text-slate-500">Opponent:</span>{' '}
                <span className="font-medium capitalize">{input.opponents[0].style}</span>
                {input.opponents[0].range && (
                  <span className="ml-1 text-slate-400">({input.opponents[0].range})</span>
                )}
              </p>
            ) : (
              <div>
                <span className="text-slate-500">Opponents:</span>
                {input.opponents.map((opp, i) => (
                  <p key={i} className="ml-2 text-sm">
                    <span className="text-slate-400">{i + 1}.</span>{' '}
                    <span className="font-medium capitalize">{opp.style}</span>
                    {opp.range && <span className="ml-1 text-slate-400">({opp.range})</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      {onSave && (
        <button
          onClick={onSave}
          disabled={saving}
          className={cn(
            'w-full py-3.5 rounded-xl font-semibold text-sm transition-all',
            'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {saving ? 'Saving...' : '💾 Save to Hand History'}
        </button>
      )}
    </div>
  );
}
