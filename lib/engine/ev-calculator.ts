import type { NormalizedScenario, EVResult, BetSizeBucket } from '@/lib/domain/types';
import { BET_SIZE_BUCKETS, DEFAULT_SIZING_PRESETS } from '@/lib/domain/types';
import { calculatePotOdds } from './pot-odds';
import { estimateEquity, getEquityRealizationFactor, estimateFoldEquity } from './equity';

// ============================================================
// EV CALCULATOR — Core expected value computation
// ============================================================
// EV of Fold  = 0 (relative to the current decision point)
// EV of Call  = (equity × potAfterCall) - amountToCall
// EV of Raise = (foldEq × currentPot) + ((1-foldEq) × equity × potAfterRaiseCall) - raiseAmount

/**
 * Calculate EV for all three action options: fold, call, raise.
 * Returns the EVResult with recommended action and sizing.
 */
export function calculateEV(scenario: NormalizedScenario): EVResult {
  const { potSizeBB, amountToCallBB, heroPosition, street, opponentStyle, actionLine } = scenario;

  // Estimate hero equity
  const equityResult = estimateEquity(scenario);
  const rawEquity = equityResult.equity;
  const realizationFactor = getEquityRealizationFactor(street, heroPosition);
  const realizedEquity = rawEquity * realizationFactor;

  // --- EV of Fold ---
  const evFold = 0;

  // --- EV of Call ---
  const potAfterCall = potSizeBB + amountToCallBB;
  const evCall = amountToCallBB === 0
    ? 0
    : realizedEquity * potAfterCall - amountToCallBB;

  // --- EV of Raise (evaluate best sizing) ---
  // In 3-bet/4-bet pots, standard sizing shifts toward larger fractions.
  // A 3-bet is typically ~3x the open raise, a 4-bet is ~2.2-2.5x the 3-bet.
  // We model this by adjusting which sizing buckets are considered.
  const sizingBuckets = getSizingBucketsForActionLine(actionLine);

  const raiseResults = sizingBuckets.map((fraction) => {
    const raiseAmount = potSizeBB * fraction;

    const effectiveRaise = Math.min(raiseAmount, scenario.effectiveStackBB - amountToCallBB);
    if (effectiveRaise <= 0) return { fraction, ev: -Infinity };

    // Pass actionLine so fold equity accounts for 3-bet/4-bet dynamics
    const foldEquity = estimateFoldEquity(fraction, opponentStyle, street, actionLine);

    const evWhenFold = foldEquity * potSizeBB;
    const potWhenCalled = potSizeBB + effectiveRaise + effectiveRaise;
    const evWhenCalled = (1 - foldEquity) * (realizedEquity * potWhenCalled - effectiveRaise);

    const totalEV = evWhenFold + evWhenCalled;
    return { fraction, ev: totalEV, raiseAmount: effectiveRaise };
  });

  const bestRaise = raiseResults.reduce(
    (best, curr) => (curr.ev > best.ev ? curr : best),
    raiseResults[0]
  );

  const evRaise = bestRaise.ev;
  const bestRaiseSizing = bestRaise.raiseAmount ?? null;
  const bestRaiseFraction = bestRaise.fraction;

  let bestAction: 'fold' | 'call' | 'raise';
  if (evRaise >= evCall && evRaise >= evFold) {
    bestAction = 'raise';
  } else if (evCall >= evFold) {
    bestAction = 'call';
  } else {
    bestAction = 'fold';
  }

  if (amountToCallBB === 0 && bestAction === 'fold') {
    bestAction = 'call';
  }

  return {
    evFold: round(evFold, 2),
    evCall: round(evCall, 2),
    evRaise: round(evRaise, 2),
    bestAction,
    bestRaiseSizing: bestRaiseSizing ? round(bestRaiseSizing, 2) : null,
    bestRaiseFraction: bestRaiseFraction ?? null,
  };
}

/**
 * Select appropriate sizing buckets based on the action line.
 * In standard single-raise pots, all bet-size buckets are valid.
 * In 3-bet pots, sizing tilts larger (50%-pot and above).
 * In 4-bet pots, it's typically all-in or very large.
 */
function getSizingBucketsForActionLine(actionLine?: string): readonly number[] {
  switch (actionLine) {
    case '3bet-vs-open':
      // Hero is 3-betting: typical 3-bet sizes are ~3x open, which is 75-100% pot
      return [0.5, 0.66, 0.75, 1.0] as const;
    case 'vs-3bet':
      // Hero faces 3-bet, considering 4-betting: sizes are large, often all-in
      return [0.66, 0.75, 1.0] as const;
    case '4bet':
      // Hero is 4-betting: typically 2-2.5x the 3-bet, very large relative to pot
      return [0.75, 1.0] as const;
    case 'vs-4bet':
      // Hero faces 4-bet: it's call, fold, or shove
      return [1.0] as const;
    default:
      return BET_SIZE_BUCKETS;
  }
}

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
