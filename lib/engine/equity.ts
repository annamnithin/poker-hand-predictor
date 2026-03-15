import type { Street, Position, PlayerStyle, NormalizedScenario } from '@/lib/domain/types';
import { canonicalizeHand, lookupRange, handStrengthInRange, opponentStyleModifier } from '@/lib/ranges/range-lookup';
import { evaluateBestHand, detectDraws, HAND_RANKS } from './hand-evaluator';
import { canonicalize, getPreflopRangeEquity } from './preflop-charts';

// ============================================================
// EQUITY ESTIMATION — Board-aware equity model
// ============================================================

export interface EquityResult {
  equity: number;
  method: 'board-eval' | 'range-lookup' | 'hand-strength-table' | 'fallback';
  rangeLabel: string;
  mappingQuality: number;
  rawHandStrength: number;     // pure made-hand strength (no draw equity)
  drawEquity: number;          // additional equity from draws
}

/**
 * Estimate hero's equity vs villain's range.
 * Priority: board evaluation → precomputed range → hand-strength table → fallback
 */
export function estimateEquity(scenario: NormalizedScenario): EquityResult {
  const { heroCards, boardCards, street, heroPosition, actionLine, opponentStyle } = scenario;

  // ---- POSTFLOP: use actual hand evaluation ----
  if (boardCards.length >= 3) {
    const handEval = evaluateBestHand(heroCards, boardCards);
    const styleMod = opponentStyleModifier(opponentStyle);

    // Base equity from made hand strength
    let madeEquity = handEval.handStrength;

    // Draw equity on appropriate streets
    let drawEquity = 0;
    if (street !== 'river') {
      drawEquity = handEval.drawEquity;
    }

    // Combine: total equity is not simply additive
    let equity = madeEquity + drawEquity * (1 - madeEquity);

    // Adjust for opponent's range width
    // Wider range (LAG/loose) = hero's equity improves
    // Narrower range (TAG) = hero's equity decreases slightly
    equity = equity / styleMod.rangeWidthMult + (equity * (1 - 1 / styleMod.rangeWidthMult)) * 0.5;
    equity = Math.min(0.98, Math.max(0.05, equity));

    // Action-line penalty (3-bet/4-bet pots → villain has stronger range)
    equity = applyActionLineEquityPenalty(equity, actionLine);

    return {
      equity,
      method: 'board-eval',
      rangeLabel: handEval.description,
      mappingQuality: 0.85,
      rawHandStrength: madeEquity,
      drawEquity,
    };
  }

  // ---- PREFLOP: use preflop range equity ----
  const canonical = canonicalize(heroCards[0], heroCards[1]);
  const pfEquity = getPreflopRangeEquity(canonical, heroPosition, actionLine);

  // Adjust for opponent style
  const styleMod = opponentStyleModifier(opponentStyle);
  let equity = pfEquity;
  // Wider opponent range means our equity is better
  if (styleMod.rangeWidthMult > 1.0) equity = Math.min(0.85, equity * 1.05);
  if (styleMod.rangeWidthMult < 1.0) equity = Math.max(0.15, equity * 0.95);

  equity = applyActionLineEquityPenalty(equity, actionLine);

  // Try precomputed range for better accuracy
  const rangeLookup = lookupRange(heroPosition, street, actionLine, scenario.stackBucket);
  if (rangeLookup) {
    const rangeEq = handStrengthInRange(canonicalizeHand(heroCards), rangeLookup.range.hands);
    const adjustedEq = applyActionLineEquityPenalty(rangeEq * (2 - styleMod.rangeWidthMult), actionLine);
    return {
      equity: Math.max(0.05, Math.min(0.95, adjustedEq)),
      method: 'range-lookup',
      rangeLabel: rangeLookup.range.label,
      mappingQuality: rangeLookup.quality,
      rawHandStrength: adjustedEq,
      drawEquity: 0,
    };
  }

  return {
    equity: Math.max(0.05, Math.min(0.95, equity)),
    method: 'hand-strength-table',
    rangeLabel: 'preflop-range',
    mappingQuality: 0.65,
    rawHandStrength: equity,
    drawEquity: 0,
  };
}

/**
 * Equity realization factor by street and position.
 * Accounts for the fact that not all equity is realized postflop.
 */
export function getEquityRealizationFactor(street: Street, position: Position): number {
  const positionBonus = ['BTN', 'CO', 'HJ'].includes(position) ? 0.05 : 0;
  switch (street) {
    case 'preflop': return 0.75 + positionBonus;
    case 'flop':    return 0.87 + positionBonus;
    case 'turn':    return 0.93 + positionBonus;
    case 'river':   return 1.0;
  }
}

/**
 * Adjust equity for action-line aggression.
 * In 3-bet/4-bet pots, villain has a stronger, condensed range.
 */
function applyActionLineEquityPenalty(equity: number, actionLine?: string): number {
  if (!actionLine) return equity;
  const penalties: Record<string, number> = {
    'open':         1.0,
    'call-vs-open': 0.95,
    '3bet-vs-open': 1.0,   // hero is aggressor
    'vs-3bet':      0.80,
    '4bet':         1.0,   // hero is aggressor
    'vs-4bet':      0.70,
  };
  return Math.max(0.05, equity * (penalties[actionLine] ?? 1.0));
}

/**
 * Estimate fold equity for raises, accounting for opponent style and board texture.
 */
export function estimateFoldEquity(
  raiseFraction: number,
  opponentStyle: PlayerStyle,
  street: Street,
  actionLine?: string,
  boardWetness?: string,
): number {
  let baseFoldEquity: number;
  if (raiseFraction <= 0.33) baseFoldEquity = 0.25;
  else if (raiseFraction <= 0.5) baseFoldEquity = 0.33;
  else if (raiseFraction <= 0.75) baseFoldEquity = 0.40;
  else if (raiseFraction <= 1.0) baseFoldEquity = 0.45;
  else baseFoldEquity = 0.52;

  const styleMod = opponentStyleModifier(opponentStyle);
  baseFoldEquity *= styleMod.foldFreqMult;

  // Street adjustments
  const streetMod: Record<Street, number> = {
    preflop: 1.0, flop: 1.0, turn: 0.88, river: 0.75,
  };
  baseFoldEquity *= streetMod[street];

  // Action line
  if (actionLine) {
    const actionLineMod: Record<string, number> = {
      'open':          1.0,
      'call-vs-open':  1.0,
      '3bet-vs-open':  1.15,
      'vs-3bet':       0.60,
      '4bet':          1.05,
      'vs-4bet':       0.40,
    };
    baseFoldEquity *= actionLineMod[actionLine] ?? 1.0;
  }

  // Board wetness: wet boards have more draws, opponents fold less
  if (boardWetness === 'very-wet' || boardWetness === 'wet') {
    baseFoldEquity *= 0.88;
  }

  return Math.max(0.05, Math.min(0.75, baseFoldEquity));
}
