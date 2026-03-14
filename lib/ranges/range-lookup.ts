import type { Position, Street, EffectiveStackBucket, PlayerStyle, RangeDefinition, RangeEntry } from '@/lib/domain/types';
import { EFFECTIVE_STACK_BUCKETS } from '@/lib/domain/types';
import rangeData from './precomputed-ranges.json';

// ============================================================
// RANGE LOOKUP — Maps scenarios to precomputed range data
// ============================================================

interface RangeStore {
  ranges: RangeDefinition[];
}

const store: RangeStore = rangeData as RangeStore;

/**
 * Find the closest effective-stack bucket for a given BB depth.
 * e.g. 85bb → 100bb bucket, 30bb → 40bb bucket
 */
export function findStackBucket(effectiveStackBB: number): EffectiveStackBucket {
  let closest: EffectiveStackBucket = 100;
  let minDist = Infinity;
  for (const bucket of EFFECTIVE_STACK_BUCKETS) {
    const dist = Math.abs(effectiveStackBB - bucket);
    if (dist < minDist) {
      minDist = dist;
      closest = bucket;
    }
  }
  return closest;
}

/**
 * Infer the most likely action line from the action history.
 * This is a simplified mapping — real solvers have full game trees.
 *
 * Preflop aggression levels:
 *   0 raises → hero is first to act → "open"
 *   1 raise (by someone else) → hero faces an open → "call-vs-open"
 *   1 raise (by hero) + 1 re-raise (by someone else) → hero faces a 3-bet → "vs-3bet"
 *   2 raises before hero → hero can 3-bet → "3bet-vs-open"
 *   3+ raises → 4-bet territory → "4bet" or "vs-4bet"
 *
 * The key distinction: is hero the aggressor or facing aggression?
 */
export function inferActionLine(
  street: Street,
  actionHistory: Array<{ action: string; actorPosition: string }>,
  heroPosition: string
): string {
  if (street === 'preflop') {
    const aggressiveActions = ['raise', '3-bet', '4-bet', 'bet', 'all-in'];

    // Collect all raises in order, noting whether hero made them
    const raises = actionHistory
      .filter((a) => aggressiveActions.includes(a.action))
      .map((a) => ({
        ...a,
        isHero: a.actorPosition === heroPosition,
      }));

    if (raises.length === 0) return 'open';

    if (raises.length === 1) {
      if (raises[0].isHero) {
        // Hero opened, no further aggression → hero was the opener
        return 'open';
      }
      // Someone else opened → hero faces an open raise
      return 'call-vs-open';
    }

    if (raises.length === 2) {
      const heroRaised = raises.some((r) => r.isHero);
      const lastRaiseIsHero = raises[raises.length - 1].isHero;

      if (lastRaiseIsHero) {
        // Hero made the most recent raise (the 3-bet) → hero is 3-betting
        return '3bet-vs-open';
      }
      if (heroRaised && !lastRaiseIsHero) {
        // Hero raised first, villain re-raised → hero faces a 3-bet
        return 'vs-3bet';
      }
      // Two raises before hero acted → hero can 3-bet
      return '3bet-vs-open';
    }

    if (raises.length === 3) {
      const lastRaiseIsHero = raises[raises.length - 1].isHero;
      if (lastRaiseIsHero) {
        // Hero made the 4-bet
        return '4bet';
      }
      // Hero faces a 4-bet
      return 'vs-4bet';
    }

    // 4+ raises → deep 4-bet/5-bet territory, map to vs-4bet as closest bucket
    return 'vs-4bet';
  }

  // Postflop: simplify to whether there's been a bet
  const postflopActions = actionHistory.filter((a) => a.action !== 'fold');
  if (postflopActions.length === 0) return 'check';
  return 'c-bet-face';
}

/**
 * Look up the best matching range definition for a scenario.
 * Returns null if no match found — the engine will use fallback estimates.
 */
export function lookupRange(
  position: Position,
  street: Street,
  actionLine: string,
  stackBucket: EffectiveStackBucket
): { range: RangeDefinition; quality: number } | null {
  // Try exact match first
  const exact = store.ranges.find(
    (r) =>
      r.position === position &&
      r.street === street &&
      r.actionLine === actionLine &&
      r.stackBucket === stackBucket
  );
  if (exact) return { range: exact, quality: 1.0 };

  // Try same position/street/action, any stack bucket
  const sameAction = store.ranges.find(
    (r) =>
      r.position === position &&
      r.street === street &&
      r.actionLine === actionLine
  );
  if (sameAction) return { range: sameAction, quality: 0.75 };

  // Try same position/street, any action line
  const samePos = store.ranges.find(
    (r) => r.position === position && r.street === street
  );
  if (samePos) return { range: samePos, quality: 0.5 };

  // Try any range for the street
  const sameStreet = store.ranges.find((r) => r.street === street);
  if (sameStreet) return { range: sameStreet, quality: 0.3 };

  return null;
}

/**
 * Calculate what % of the precomputed range a specific hand falls into.
 * Returns a rough equity estimate — this is the core abstraction shortcut.
 */
export function handStrengthInRange(
  heroHand: string,
  rangeHands: RangeEntry[]
): number {
  // Convert hero's two cards to canonical notation
  const canonical = canonicalizeHand(heroHand);

  // Check if hero's hand is in the range
  const match = rangeHands.find((h) => h.hand === canonical);
  if (match) {
    // Hero's hand is in villain's range — stronger hands in range reduce hero equity
    // Simple heuristic: hands with higher frequency are "standard" — hero equity ~ 50%
    // Hands at lower frequency are more marginal
    return 0.45 + match.frequency * 0.10;
  }

  // Hero's hand is NOT in villain's range
  // If the range is tight, hero's non-range hand is likely weak against it
  const avgFreq = rangeHands.reduce((sum, h) => sum + h.frequency, 0) / rangeHands.length;
  const rangeWidth = rangeHands.length;

  // Wider range = hero may have more equity even outside it
  if (rangeWidth > 40) return 0.40;
  if (rangeWidth > 25) return 0.35;
  return 0.30;
}

/**
 * Convert two hole cards like ["Ah", "Kd"] to canonical hand notation like "AKo".
 */
export function canonicalizeHand(hand: string | [string, string]): string {
  let c1: string, c2: string;
  if (Array.isArray(hand)) {
    [c1, c2] = hand;
  } else {
    // Already canonical like "AKo"
    return hand;
  }

  const rank1 = c1[0];
  const suit1 = c1[1];
  const rank2 = c2[0];
  const suit2 = c2[1];

  const RANK_ORDER = '23456789TJQKA';
  const r1 = RANK_ORDER.indexOf(rank1);
  const r2 = RANK_ORDER.indexOf(rank2);

  // Pairs
  if (rank1 === rank2) return `${rank1}${rank2}`;

  // Suited vs offsuit
  const suited = suit1 === suit2;
  const suffix = suited ? 's' : 'o';

  // Higher rank first
  if (r1 > r2) return `${rank1}${rank2}${suffix}`;
  return `${rank2}${rank1}${suffix}`;
}

/**
 * Apply opponent style adjustments to range width.
 * Returns a multiplier for how much wider/narrower the range should be.
 */
export function opponentStyleModifier(style: PlayerStyle): {
  rangeWidthMult: number;
  foldFreqMult: number;
  aggressionMult: number;
} {
  switch (style) {
    case 'TAG':
      return { rangeWidthMult: 0.85, foldFreqMult: 1.1, aggressionMult: 1.15 };
    case 'LAG':
      return { rangeWidthMult: 1.3, foldFreqMult: 0.85, aggressionMult: 1.3 };
    case 'tight-passive':
      return { rangeWidthMult: 0.7, foldFreqMult: 1.2, aggressionMult: 0.7 };
    case 'loose-passive':
      return { rangeWidthMult: 1.4, foldFreqMult: 0.7, aggressionMult: 0.75 };
    case 'unknown':
    default:
      return { rangeWidthMult: 1.0, foldFreqMult: 1.0, aggressionMult: 1.0 };
  }
}

/**
 * Get all loaded ranges (for debugging / admin).
 */
export function getAllRanges(): RangeDefinition[] {
  return store.ranges;
}
