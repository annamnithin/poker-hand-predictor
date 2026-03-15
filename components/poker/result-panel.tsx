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

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fold:  { bg: 'bg-gradient-to-r from-red-500 to-red-600',     text: 'text-white', border: 'border-red-200' },
  call:  { bg: 'bg-gradient-to-r from-blue-500 to-blue-600',   text: 'text-white', border: 'border-blue-200' },
  check: { bg: 'bg-gradient-to-r from-slate-500 to-slate-600', text: 'text-white', border: 'border-slate-200' },
  bet:   { bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600', text: 'text-white', border: 'border-emerald-200' },
  raise: { bg: 'bg-gradient-to-r from-violet-500 to-violet-600', text: 'text-white', border: 'border-violet-200' },
};

const WETNESS_COLORS: Record<string, string> = {
  'very-wet': 'text-blue-700 bg-blue-50',
  'wet':      'text-sky-700 bg-sky-50',
  'semi-wet': 'text-teal-700 bg-teal-50',
  'dry':      'text-amber-700 bg-amber-50',
};

const CATEGORY_COLORS: Record<string, string> = {
  monster:     'text-violet-700 bg-violet-50',
  strong:      'text-emerald-700 bg-emerald-50',
  medium:      'text-blue-700 bg-blue-50',
  'weak-made': 'text-amber-700 bg-amber-50',
  'draw-heavy':'text-orange-700 bg-orange-50',
  air:         'text-slate-500 bg-slate-100',
};

const SPR_COLORS: Record<string, string> = {
  micro:  'text-red-700 bg-red-50',
  low:    'text-orange-700 bg-orange-50',
  medium: 'text-blue-700 bg-blue-50',
  deep:   'text-green-700 bg-green-50',
};

export function ResultPanel({ result, input, onSave, saving }: ResultPanelProps) {
  const { ev, confidence, explanation, breakdown, gtoContext } = result;
  const colors = ACTION_COLORS[ev.bestAction] ?? ACTION_COLORS.call;

  const facingBet = input.amountToCall > 0;

  return (
    <div className="space-y-4">
      {/* ─── Headline Action ─── */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className={cn('px-6 py-5 text-center', colors.bg)}>
          <div className="text-white/75 text-xs font-semibold uppercase tracking-widest mb-1">
            Recommended Action
          </div>
          <div className="text-white text-4xl font-black capitalize tracking-tight">
            {ev.bestAction}
          </div>
          {ev.bestAction === 'raise' && ev.bestRaiseFraction && (
            <div className="text-white/85 text-sm font-medium mt-1">
              {Math.round(ev.bestRaiseFraction * 100)}% pot
              {ev.bestRaiseSizing && ` ≈ ${ev.bestRaiseSizing.toFixed(1)} BB`}
            </div>
          )}
          {ev.bestAction === 'bet' && ev.bestBetFraction && (
            <div className="text-white/85 text-sm font-medium mt-1">
              {Math.round(ev.bestBetFraction * 100)}% pot
              {ev.bestBetSizing && ` ≈ ${ev.bestBetSizing.toFixed(1)} BB`}
            </div>
          )}
        </div>
      </Card>

      {/* ─── GTO Hand + Board Context ─── */}
      {gtoContext && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hand Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Hand strength */}
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Made Hand</div>
                <span className={cn('text-sm font-semibold px-2 py-0.5 rounded-full', CATEGORY_COLORS[gtoContext.handCategory] ?? 'text-slate-700 bg-slate-100')}>
                  {gtoContext.handDescription || 'Evaluating...'}
                </span>
              </div>
              {gtoContext.sprCategory && (
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">SPR</div>
                  <span className={cn('text-sm font-semibold px-2 py-0.5 rounded-full', SPR_COLORS[gtoContext.sprCategory] ?? 'text-slate-700 bg-slate-100')}>
                    {gtoContext.spr} ({gtoContext.sprCategory})
                  </span>
                </div>
              )}
              {gtoContext.isIP !== undefined && (
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Position</div>
                  <span className={cn('text-sm font-semibold px-2 py-0.5 rounded-full', gtoContext.isIP ? 'text-emerald-700 bg-emerald-50' : 'text-slate-700 bg-slate-100')}>
                    {gtoContext.isIP ? 'In Position' : 'Out of Position'}
                  </span>
                </div>
              )}
            </div>

            {/* Draws */}
            {gtoContext.draws && gtoContext.draws.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Active Draws</div>
                <div className="flex flex-wrap gap-1.5">
                  {gtoContext.draws.map((draw, i) => (
                    <span key={i} className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                      {draw.description} ({draw.outs > 0 ? `${draw.outs} outs` : 'backdoor'}, +{(draw.equity * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Board Texture */}
            {gtoContext.boardTexture && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Board Texture</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', WETNESS_COLORS[gtoContext.boardTexture.wetness] ?? 'text-slate-600 bg-slate-100')}>
                    {gtoContext.boardTexture.wetness}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                    {gtoContext.boardTexture.flushTexture}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                    {gtoContext.boardTexture.connectedness}
                  </span>
                  {gtoContext.boardTexture.pairStructure !== 'unpaired' && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 capitalize">
                      {gtoContext.boardTexture.pairStructure}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Exploitative note */}
            {gtoContext.exploitLabel && gtoContext.exploitReasoning && (
              <div className="text-xs bg-violet-50 text-violet-800 rounded-lg px-3 py-2 border border-violet-100">
                <span className="font-semibold">{gtoContext.exploitLabel}: </span>
                {gtoContext.exploitReasoning}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── EV Display ─── */}
      <EVDisplay ev={ev} />

      {/* ─── Confidence ─── */}
      <Card>
        <CardContent className="pt-5">
          <ConfidenceMeter value={confidence} />
        </CardContent>
      </Card>

      {/* ─── Explanation ─── */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
        </CardContent>
      </Card>

      {/* ─── Metrics Breakdown ─── */}
      <Card>
        <CardHeader>
          <CardTitle>GTO Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2.5 text-sm">
            {facingBet && (
              <MetricRow label="Pot Odds" value={`${breakdown.potOdds}%`} />
            )}
            <MetricRow label="Hero Equity" value={`${breakdown.heroEquity}%`} />
            <MetricRow label="Eq. Realization" value={`${(breakdown.equityRealizationFactor * 100).toFixed(0)}%`} />
            <MetricRow label="Fold Equity" value={`${breakdown.foldEquity}%`} />
            {gtoContext?.spr !== undefined && (
              <MetricRow label="SPR" value={gtoContext.spr.toFixed(1)} />
            )}
          </div>

          <div className="mt-3 text-sm">
            <span className="text-slate-500">Villain range est.: </span>
            <span className="font-medium text-slate-700">{breakdown.villainContinueRange}</span>
          </div>

          {breakdown.notes.length > 0 && (
            <div className="mt-3 space-y-1">
              {breakdown.notes.map((note, i) => (
                <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                  {note}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Scenario Snapshot ─── */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1.5 text-slate-600">
            <SnapshotRow label="Street" value={<span className="capitalize font-medium">{input.street}</span>} />
            <SnapshotRow label="Hero Cards" value={
              <span className="font-mono font-semibold tracking-wide">{input.heroCards.map(formatCard).join('  ')}</span>
            } />
            {input.boardCards.length > 0 && (
              <SnapshotRow label="Board" value={
                <span className="font-mono font-medium">{input.boardCards.map(formatCard).join('  ')}</span>
              } />
            )}
            <SnapshotRow label="Position" value={<span className="font-medium">{input.heroPosition}</span>} />
            <SnapshotRow label="Pot / To Call" value={
              <span className="font-medium">
                {input.potSize} BB{input.amountToCall > 0 ? ` / ${input.amountToCall} BB` : ' (no bet)'}
              </span>
            } />
            <SnapshotRow label="Stacks" value={
              <span className="font-medium">Hero {input.heroStack} / Villain {input.villainStack}</span>
            } />
            {input.opponents.length === 1 ? (
              <SnapshotRow label="Opponent" value={
                <span className="font-medium capitalize">
                  {input.opponents[0].style}
                  {input.opponents[0].range && <span className="text-slate-400 ml-1">({input.opponents[0].range})</span>}
                </span>
              } />
            ) : (
              <div>
                <span className="text-slate-500">Opponents: </span>
                {input.opponents.map((opp, i) => (
                  <span key={i} className="inline-flex items-center gap-1 ml-1">
                    <span className="text-slate-400 text-xs">{i + 1}.</span>
                    <span className="font-medium capitalize text-xs">{opp.style}</span>
                    {opp.range && <span className="text-slate-400 text-xs">({opp.range})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Save Button ─── */}
      {onSave && (
        <button
          onClick={onSave}
          disabled={saving}
          className={cn(
            'w-full py-3.5 rounded-xl font-semibold text-sm transition-all',
            'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {saving ? 'Saving...' : 'Save to Hand History'}
        </button>
      )}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="text-slate-400 shrink-0">{label}:</span>
      <span>{value}</span>
    </p>
  );
}
