import type { Street, Position, PlayerStyle, NormalizedScenario } from '@/lib/domain/types';
import { canonicalizeHand, lookupRange, handStrengthInRange, opponentStyleModifier } from '@/lib/ranges/range-lookup';

// ============================================================
// EQUITY ESTIMATION — Simplified equity model for MVP
// ============================================================

const HAND_STRENGTH_TABLE: Record<string, number> = {
  // Pairs (13)
  AA: 0.853, KK: 0.823, QQ: 0.800, JJ: 0.775,
  TT: 0.752, '99': 0.721, '88': 0.693, '77': 0.663,
  '66': 0.633, '55': 0.603, '44': 0.573, '33': 0.543, '22': 0.513,

  // Ace-suited (12)
  AKs: 0.672, AQs: 0.661, AJs: 0.652, ATs: 0.641,
  A9s: 0.612, A8s: 0.601, A7s: 0.591, A6s: 0.582,
  A5s: 0.592, A4s: 0.581, A3s: 0.571, A2s: 0.561,

  // King-suited (11)
  KQs: 0.631, KJs: 0.621, KTs: 0.611, K9s: 0.581,
  K8s: 0.561, K7s: 0.551, K6s: 0.541, K5s: 0.531,
  K4s: 0.521, K3s: 0.511, K2s: 0.502,

  // Queen-suited (10)
  QJs: 0.601, QTs: 0.591, Q9s: 0.561, Q8s: 0.541,
  Q7s: 0.521, Q6s: 0.511, Q5s: 0.501, Q4s: 0.491,
  Q3s: 0.481, Q2s: 0.471,

  // Jack-suited (9)
  JTs: 0.581, J9s: 0.551, J8s: 0.531, J7s: 0.511,
  J6s: 0.491, J5s: 0.481, J4s: 0.471, J3s: 0.461, J2s: 0.451,

  // Ten-suited (8)
  T9s: 0.551, T8s: 0.531, T7s: 0.511, T6s: 0.491,
  T5s: 0.471, T4s: 0.461, T3s: 0.451, T2s: 0.441,

  // Nine-suited (7)
  '98s': 0.541, '97s': 0.521, '96s': 0.501, '95s': 0.481,
  '94s': 0.461, '93s': 0.451, '92s': 0.441,

  // Eight-suited (6)
  '87s': 0.531, '86s': 0.511, '85s': 0.491, '84s': 0.461,
  '83s': 0.451, '82s': 0.441,

  // Seven-suited (5)
  '76s': 0.521, '75s': 0.501, '74s': 0.481, '73s': 0.451, '72s': 0.441,

  // Six-suited (4)
  '65s': 0.511, '64s': 0.491, '63s': 0.461, '62s': 0.451,

  // Five-suited (3)
  '54s': 0.501, '53s': 0.481, '52s': 0.451,

  // Four-suited (2)
  '43s': 0.471, '42s': 0.451,

  // Three-suited (1)
  '32s': 0.461,

  // Ace-offsuit (12)
  AKo: 0.651, AQo: 0.641, AJo: 0.621, ATo: 0.601,
  A9o: 0.581, A8o: 0.571, A7o: 0.561, A6o: 0.551,
  A5o: 0.561, A4o: 0.551, A3o: 0.541, A2o: 0.531,

  // King-offsuit (11)
  KQo: 0.601, KJo: 0.591, KTo: 0.571, K9o: 0.551,
  K8o: 0.531, K7o: 0.521, K6o: 0.511, K5o: 0.501,
  K4o: 0.491, K3o: 0.481, K2o: 0.471,

  // Queen-offsuit (10)
  QJo: 0.561, QTo: 0.551, Q9o: 0.531, Q8o: 0.511,
  Q7o: 0.491, Q6o: 0.481, Q5o: 0.471, Q4o: 0.461,
  Q3o: 0.451, Q2o: 0.441,

  // Jack-offsuit (9)
  JTo: 0.541, J9o: 0.521, J8o: 0.501, J7o: 0.481,
  J6o: 0.461, J5o: 0.451, J4o: 0.441, J3o: 0.431, J2o: 0.421,

  // Ten-offsuit (8)
  T9o: 0.521, T8o: 0.501, T7o: 0.481, T6o: 0.461,
  T5o: 0.441, T4o: 0.431, T3o: 0.421, T2o: 0.411,

  // Nine-offsuit (7)
  '98o': 0.501, '97o': 0.481, '96o': 0.461, '95o': 0.441,
  '94o': 0.431, '93o': 0.421, '92o': 0.411,

  // Eight-offsuit (6)
  '87o': 0.491, '86o': 0.471, '85o': 0.451, '84o': 0.431,
  '83o': 0.421, '82o': 0.411,

  // Seven-offsuit (5)
  '76o': 0.481, '75o': 0.461, '74o': 0.441, '73o': 0.421, '72o': 0.411,

  // Six-offsuit (4)
  '65o': 0.471, '64o': 0.451, '63o': 0.431, '62o': 0.421,

  // Five-offsuit (3)
  '54o': 0.461, '53o': 0.441, '52o': 0.421,

  // Four-offsuit (2)
  '43o': 0.441, '42o': 0.421,

  // Three-offsuit (1)
  '32o': 0.431,
};

const DEFAULT_EQUITY = 0.40;

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
