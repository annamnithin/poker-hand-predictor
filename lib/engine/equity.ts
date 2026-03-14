import type { Street, Position, PlayerStyle, NormalizedScenario } from '@/lib/domain/types';
import { canonicalizeHand, lookupRange, handStrengthInRange, opponentStyleModifier } from '@/lib/ranges/range-lookup';

// ============================================================
// EQUITY ESTIMATION — Simplified equity model for MVP
// ============================================================

const HAND_STRENGTH_TABLE: Record<string, number> = {
  AA: 0.85, KK: 0.82, QQ: 0.80, JJ: 0.77,
  TT: 0.75, '99': 0.72, '88': 0.69, '77': 0.66,
  '66': 0.63, '55': 0.60, '44': 0.57, '33': 0.54, '22': 0.51,
  AKs: 0.67, AKo: 0.65, AQs: 0.66, AQo: 0.63,
  AJs: 0.65, AJo: 0.62, ATs: 0.64, ATo: 0.60,
  KQs: 0.63, KQo: 0.60, KJs: 0.62, KJo: 0.59,
  KTs: 0.61, QJs: 0.60, QTs: 0.59, JTs: 0.58,
  A9s: 0.61, A8s: 0.60, A7s: 0.59, A6s: 0.58,
  A5s: 0.59, A4s: 0.58, A3s: 0.57, A2s: 0.56,
  T9s: 0.55, '98s': 0.54, '87s': 0.53, '76s': 0.52, '65s': 0.51, '54s': 0.50,
  KTo: 0.57, QJo: 0.56, QTo: 0.55, JTo: 0.54,
  J9s: 0.53, T8s: 0.52, '97s': 0.51, '86s': 0.50,
};

const DEFAULT_EQUITY = 0.42;

/**
 * Estimate hero's equity against villain's range.
 */
export function estimateEquity(scenario: NormalizedScenario): {
  equity: number;
  method: 'range-lookup' | 'hand-strength-table' | 'fallback';
  rangeLabel: string;
  mappingQuality: number;
} {
  const canonical = canonicalizeHand(scenario.heroCards);
  // Use the action line already computed during normalization
  const actionLine = scenario.actionLine;

  // Step 1: Try precomputed range
  const rangeLookup = lookupRange(
    scenario.heroPosition,
    scenario.street,
    actionLine,
    scenario.stackBucket
  );

  if (rangeLookup) {
    const equity = handStrengthInRange(canonical, rangeLookup.range.hands);
    const styleMod = opponentStyleModifier(scenario.opponentStyle);
    let adjustedEquity = equity * (2 - styleMod.rangeWidthMult);
    // Apply action-line penalty even for range-lookup path:
    // in vs-3bet/vs-4bet pots, if the hand isn't in villain's range,
    // it's likely dominated by the hands that ARE in range.
    adjustedEquity = applyActionLineEquityPenalty(adjustedEquity, actionLine);
    adjustedEquity = Math.max(0.1, Math.min(0.95, adjustedEquity));

    return {
      equity: adjustedEquity,
      method: 'range-lookup',
      rangeLabel: rangeLookup.range.label,
      mappingQuality: rangeLookup.quality,
    };
  }

  // Step 2: Hand strength table
  const tableEquity = HAND_STRENGTH_TABLE[canonical];
  if (tableEquity !== undefined) {
    const streetFactor = getStreetEquityFactor(scenario.street);
    let equity = tableEquity * streetFactor;
    // Adjust equity for action line: villain's range is tighter in 3-bet/4-bet pots
    equity = applyActionLineEquityPenalty(equity, scenario.actionLine);
    return {
      equity: Math.max(0.1, Math.min(0.95, equity)),
      method: 'hand-strength-table',
      rangeLabel: 'generic-range',
      mappingQuality: 0.4,
    };
  }

  // Step 3: Fallback — hand not in any table, likely junk
  let fallbackEquity = DEFAULT_EQUITY;
  fallbackEquity = applyActionLineEquityPenalty(fallbackEquity, scenario.actionLine);
  return {
    equity: fallbackEquity,
    method: 'fallback',
    rangeLabel: 'unknown',
    mappingQuality: 0.2,
  };
}

/**
 * Equity realization factor by street.
 */
export function getEquityRealizationFactor(street: Street, position: Position): number {
  const positionBonus = ['BTN', 'CO', 'HJ'].includes(position) ? 0.05 : 0;
  switch (street) {
    case 'preflop': return 0.75 + positionBonus;
    case 'flop': return 0.85 + positionBonus;
    case 'turn': return 0.92 + positionBonus;
    case 'river': return 1.0;
  }
}

function getStreetEquityFactor(street: Street): number {
  switch (street) {
    case 'preflop': return 1.0;
    case 'flop': return 0.95;
    case 'turn': return 0.90;
    case 'river': return 0.85;
  }
}

/**
 * Adjust equity based on the aggression level of the pot.
 * In 3-bet and 4-bet pots, villain's range is much narrower and stronger.
 * This means hero's equity with non-premium hands drops significantly
 * because villain has eliminated their weak holdings.
 *
 * The penalty is larger for weaker hands (lower base equity).
 * Premium hands (equity > 0.7) are barely affected because they do well
 * against any range. Junk hands get a steep equity reduction.
 */
function applyActionLineEquityPenalty(equity: number, actionLine?: string): number {
  if (!actionLine) return equity;

  // How much to reduce equity based on pot aggression
  // The multiplier is applied to equity. 1.0 = no change.
  const penalties: Record<string, number> = {
    'open':         1.0,   // standard pot
    'call-vs-open': 0.95,  // villain has opening range, slight reduction
    '3bet-vs-open': 1.0,   // hero is the 3-bettor — no penalty to hero
    'vs-3bet':      0.80,  // villain 3-bet → strong range, significant equity drop for marginal hands
    '4bet':         1.0,   // hero is the 4-bettor — no penalty to hero
    'vs-4bet':      0.70,  // villain 4-bet → very strong range, big equity drop
  };

  const penalty = penalties[actionLine] ?? 1.0;
  return Math.max(0.1, equity * penalty);
}

/**
 * Estimate fold equity for a raise.
 * The optional actionLine parameter adjusts for 3-bet/4-bet pots where
 * villain has already shown strength — they fold less because their
 * continuing range is much narrower and stronger.
 */
export function estimateFoldEquity(
  raiseFraction: number,
  opponentStyle: PlayerStyle,
  street: Street,
  actionLine?: string
): number {
  let baseFoldEquity: number;
  if (raiseFraction <= 0.33) baseFoldEquity = 0.25;
  else if (raiseFraction <= 0.5) baseFoldEquity = 0.33;
  else if (raiseFraction <= 0.75) baseFoldEquity = 0.40;
  else if (raiseFraction <= 1.0) baseFoldEquity = 0.45;
  else baseFoldEquity = 0.50;

  const styleMod = opponentStyleModifier(opponentStyle);
  baseFoldEquity *= styleMod.foldFreqMult;

  const streetMod: Record<Street, number> = {
    preflop: 1.0, flop: 1.0, turn: 0.90, river: 0.80,
  };
  baseFoldEquity *= streetMod[street];

  // In 3-bet and 4-bet pots, villain's range is already condensed.
  // They fold much less because they've already committed with strength.
  // vs-3bet: villain 3-bet us → their range is ~8-15% of hands, very strong
  // vs-4bet: villain 4-bet us → their range is ~3-5% of hands, monster-heavy
  // 3bet-vs-open: we are the 3-bettor — villain folds their open-raise junk (higher fold equity)
  // 4bet: we are the 4-bettor — villain folds their 3-bet bluffs (moderate fold equity)
  if (actionLine) {
    const actionLineMod: Record<string, number> = {
      'open':          1.0,   // standard spot
      'call-vs-open':  1.0,   // standard call vs open
      '3bet-vs-open':  1.15,  // hero is 3-betting → villain folds open junk MORE
      'vs-3bet':       0.60,  // hero faces 3-bet → villain's range is strong, folds LESS
      '4bet':          1.05,  // hero is 4-betting → villain folds 3-bet bluffs slightly more
      'vs-4bet':       0.40,  // hero faces 4-bet → villain's range is extremely narrow, folds very little
    };
    baseFoldEquity *= actionLineMod[actionLine] ?? 1.0;
  }

  return Math.max(0.05, Math.min(0.75, baseFoldEquity));
}
