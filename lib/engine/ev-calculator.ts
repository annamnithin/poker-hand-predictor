import type { NormalizedScenario, EVResult } from '@/lib/domain/types';
import { BET_SIZE_BUCKETS } from '@/lib/domain/types';
import { calculatePotOdds } from './pot-odds';
import { estimateEquity, getEquityRealizationFactor, estimateFoldEquity } from './equity';
import { analyzeBoardTexture, getOptimalBetSizing } from './board-texture';
import { evaluateBestHand } from './hand-evaluator';
import { computeSPR } from './gto-advisor';

// ============================================================
// EV CALCULATOR — Five-action EV computation
// Supports: fold, check, call, bet, raise
// ============================================================

export function calculateEV(scenario: NormalizedScenario): EVResult {
  const { potSizeBB, amountToCallBB, heroPosition, street, opponentStyle, actionLine, boardCards, heroCards } = scenario;

  const equityResult = estimateEquity(scenario);
  const rawEquity = equityResult.equity;
  const realizationFactor = getEquityRealizationFactor(street, heroPosition);
  const realizedEquity = rawEquity * realizationFactor;

  const board = analyzeBoardTexture(boardCards);
  const handEval = evaluateBestHand(heroCards, boardCards);
  const spr = computeSPR(scenario.effectiveStackBB, potSizeBB);

  // Determine if there's a bet to face
  const facingBet = amountToCallBB > 0;

  // ---- EV of Fold (always 0 by definition) ----
  const evFold = 0;

  // ---- EV of Check (only valid when no bet to face) ----
  // Check EV ≈ realizedEquity × future pot (estimated), with no chips invested
  // Simplified: check gives the pot equity without immediate risk
  const evCheck = facingBet ? -Infinity : realizedEquity * potSizeBB * 0.7;

  // ---- EV of Call (only valid when facing a bet) ----
  const potAfterCall = potSizeBB + amountToCallBB;
  const evCall = !facingBet ? -Infinity
    : amountToCallBB === 0
      ? 0
      : realizedEquity * potAfterCall - amountToCallBB;

  // ---- EV of Raise (valid when facing a bet) ----
  const raiseBuckets = getSizingBucketsForActionLine(actionLine, spr.category);
  let evRaise = -Infinity;
  let bestRaiseSizing: number | null = null;
  let bestRaiseFraction: number | null = null;

  if (facingBet) {
    // Pot after call is the correct base for raise sizing
    const potAfterCallBase = potSizeBB + amountToCallBB;
    const minRaise = amountToCallBB * 2; // minimum raise = 2x the bet

    const raiseResults = raiseBuckets.map((fraction) => {
      // Raise sizing expressed as % of pot-after-call (standard GTO convention)
      const targetRaise = Math.max(minRaise, potAfterCallBase * fraction);
      const effectiveRaise = Math.min(targetRaise, scenario.effectiveStackBB);
      if (effectiveRaise <= amountToCallBB) return { fraction, ev: -Infinity, raiseAmount: 0 };

      const foldEq = estimateFoldEquity(fraction, opponentStyle, street, actionLine, board.wetness);
      const evWhenFold = foldEq * potSizeBB;
      const potWhenCalled = potSizeBB + effectiveRaise + amountToCallBB; // pot if villain calls our raise
      const evWhenCalled = (1 - foldEq) * (realizedEquity * potWhenCalled - effectiveRaise);

      // Actual sizing fraction = raise amount relative to pot-after-call
      const actualFraction = effectiveRaise / potAfterCallBase;
      return { fraction: actualFraction, ev: evWhenFold + evWhenCalled, raiseAmount: effectiveRaise };
    });

    const bestRaise = raiseResults.reduce((b, c) => (c.ev > b.ev ? c : b), raiseResults[0]);
    evRaise = bestRaise.ev;
    bestRaiseSizing = bestRaise.ev > -Infinity ? round(bestRaise.raiseAmount, 2) : null;
    bestRaiseFraction = bestRaise.ev > -Infinity ? round(bestRaise.fraction, 2) : null;
  }

  // ---- EV of Bet (only valid when no bet to face) ----
  const betBuckets = getBetSizingForBoard(board.wetness, board.pairStructure, street, handEval.category, handEval.draws.length > 0, spr.category);
  let evBet = -Infinity;
  let bestBetSizing: number | null = null;
  let bestBetFraction: number | null = null;

  if (!facingBet) {
    const betResults = betBuckets.map((fraction) => {
      const betAmount = potSizeBB * fraction;
      const effectiveBet = Math.min(betAmount, scenario.effectiveStackBB);
      if (effectiveBet <= 0) return { fraction, ev: -Infinity, betAmount: 0 };

      const foldEq = estimateFoldEquity(fraction, opponentStyle, street, actionLine, board.wetness);
      const evWhenFold = foldEq * potSizeBB;
      const potWhenCalled = potSizeBB + effectiveBet * 2;
      const evWhenCalled = (1 - foldEq) * (realizedEquity * potWhenCalled - effectiveBet);

      return { fraction, ev: evWhenFold + evWhenCalled, betAmount: effectiveBet };
    });

    const bestBet = betResults.reduce((b, c) => (c.ev > b.ev ? c : b), betResults[0]);
    evBet = bestBet.ev;
    bestBetSizing = bestBet.ev > -Infinity ? round(bestBet.betAmount, 2) : null;
    bestBetFraction = bestBet.ev > -Infinity ? bestBet.fraction : null;
  }

  // ---- Pick best action ----
  const options = [
    { action: 'fold' as const, ev: evFold },
    { action: 'check' as const, ev: evCheck },
    { action: 'call' as const, ev: evCall },
    { action: 'bet' as const, ev: evBet },
    { action: 'raise' as const, ev: evRaise },
  ].filter((o) => o.ev > -Infinity);

  let best = options.reduce((b, c) => (c.ev > b.ev ? c : b), options[0]);

  // Rule: never fold when check is free (amountToCall === 0)
  if (!facingBet && best.action === 'fold') {
    best = { action: 'check', ev: evCheck };
  }

  return {
    evFold: round(evFold, 2),
    evCall: round(facingBet ? evCall : 0, 2),
    evRaise: round(facingBet ? evRaise : 0, 2),
    evCheck: round(!facingBet ? evCheck : 0, 2),
    evBet: round(!facingBet ? evBet : 0, 2),
    bestAction: best.action,
    bestRaiseSizing,
    bestRaiseFraction,
    bestBetSizing,
    bestBetFraction,
  };
}

/**
 * Raise sizing buckets based on action line and SPR.
 */
function getSizingBucketsForActionLine(actionLine: string | undefined, sprCategory: string): readonly number[] {
  if (sprCategory === 'micro') return [1.0] as const; // pot-committed, just shove
  switch (actionLine) {
    case '3bet-vs-open': return [0.5, 0.66, 0.75, 1.0] as const;
    case 'vs-3bet':      return [0.66, 0.75, 1.0] as const;
    case '4bet':         return [0.75, 1.0] as const;
    case 'vs-4bet':      return [1.0] as const;
    default:             return BET_SIZE_BUCKETS;
  }
}

/**
 * Bet sizing buckets tuned to board texture and hand category.
 */
function getBetSizingForBoard(
  wetness: string,
  pairStructure: string,
  street: string,
  handCategory: string,
  hasDraws: boolean,
  sprCategory: string,
): readonly number[] {
  if (sprCategory === 'micro') return [1.0] as const;

  // Default: smaller on wet, larger on dry
  const wetBuckets = [0.25, 0.33, 0.50] as const;
  const dryBuckets = [0.50, 0.66, 0.75] as const;
  const riverBuckets = [0.50, 0.66, 0.75, 1.0] as const;

  if (street === 'river') return riverBuckets;
  if (wetness === 'very-wet' || wetness === 'wet') return wetBuckets;
  if (wetness === 'dry') return dryBuckets;
  return BET_SIZE_BUCKETS;
}

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
