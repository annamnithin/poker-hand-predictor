import type { Position } from '@/lib/domain/types';

// ============================================================
// GTO PREFLOP CHARTS — Position-based opening / defense ranges
// ============================================================
// Based on solver-approximate GTO principles for 6-max/9-max NLH.
// Hands stored as canonical notation: "AKs", "AKo", "AA", etc.

// Ranks for canonical lookups
const RANK_ORDER = '23456789TJQKA';
const RANK_VALUE: Record<string, number> = {};
for (let i = 0; i < RANK_ORDER.length; i++) RANK_VALUE[RANK_ORDER[i]] = i + 2;

/** Canonical two-card hand notation (e.g., "AKs", "TT", "J9o") */
export function canonicalize(card1: string, card2: string): string {
  const r1 = card1[0];
  const r2 = card2[0];
  const s1 = card1[1];
  const s2 = card2[1];

  if (r1 === r2) {
    return r1 + r2; // pocket pair
  }
  const suited = s1 === s2;
  const high = RANK_VALUE[r1] >= RANK_VALUE[r2] ? r1 : r2;
  const low = RANK_VALUE[r1] >= RANK_VALUE[r2] ? r2 : r1;
  return high + low + (suited ? 's' : 'o');
}

// ============================================================
// RFI (Raise First In) Ranges
// ============================================================
// Each position's opening range as a Set of canonical hands.
// These approximate GTO solver frequencies (high freq = 1.0, mixed = partial).

/** RFI frequency by position and hand.
 *  Value 1.0 = always open, 0.5 = mixed/sometimes, 0 = never */
export const RFI_RANGES: Record<Position, Record<string, number>> = {
  UTG: {
    // Pairs
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 0.8, '77': 0.5,
    '66': 0.3, '55': 0.2,
    // Ace suited
    AKs: 1, AQs: 1, AJs: 1, ATs: 1, A9s: 0.8, A8s: 0.7, A7s: 0.6,
    A6s: 0.5, A5s: 0.8, A4s: 0.6, A3s: 0.5, A2s: 0.4,
    // Ace offsuit
    AKo: 1, AQo: 1, AJo: 0.9, ATo: 0.7,
    // King suited
    KQs: 1, KJs: 1, KTs: 0.9, K9s: 0.7, K8s: 0.4, K7s: 0.3,
    // King offsuit
    KQo: 0.9, KJo: 0.7, KTo: 0.5,
    // Queen suited
    QJs: 0.9, QTs: 0.8, Q9s: 0.5, Q8s: 0.3,
    // Queen offsuit
    QJo: 0.6, QTo: 0.4,
    // Jack suited
    JTs: 0.8, J9s: 0.5, J8s: 0.3,
    JTo: 0.4,
    // Connectors
    T9s: 0.6, T8s: 0.4,
    '98s': 0.5, '87s': 0.4, '76s': 0.3,
  },
  'UTG+1': {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 0.9, '77': 0.6,
    '66': 0.4, '55': 0.3,
    AKs: 1, AQs: 1, AJs: 1, ATs: 1, A9s: 0.9, A8s: 0.7, A7s: 0.6,
    A6s: 0.6, A5s: 0.9, A4s: 0.7, A3s: 0.5, A2s: 0.4,
    AKo: 1, AQo: 1, AJo: 0.9, ATo: 0.75,
    KQs: 1, KJs: 1, KTs: 1, K9s: 0.7, K8s: 0.5, K7s: 0.4,
    KQo: 0.95, KJo: 0.75, KTo: 0.55,
    QJs: 1, QTs: 0.9, Q9s: 0.6, Q8s: 0.4,
    QJo: 0.7, QTo: 0.5,
    JTs: 0.9, J9s: 0.6, J8s: 0.4,
    JTo: 0.5,
    T9s: 0.7, T8s: 0.5,
    '98s': 0.6, '87s': 0.5, '76s': 0.4, '65s': 0.3,
  },
  'UTG+2': {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 0.7,
    '66': 0.5, '55': 0.4, '44': 0.2,
    AKs: 1, AQs: 1, AJs: 1, ATs: 1, A9s: 1, A8s: 0.8, A7s: 0.7,
    A6s: 0.7, A5s: 0.9, A4s: 0.75, A3s: 0.6, A2s: 0.5,
    AKo: 1, AQo: 1, AJo: 1, ATo: 0.85, A9o: 0.5,
    KQs: 1, KJs: 1, KTs: 1, K9s: 0.8, K8s: 0.5, K7s: 0.4,
    KQo: 1, KJo: 0.85, KTo: 0.65,
    QJs: 1, QTs: 1, Q9s: 0.7, Q8s: 0.5,
    QJo: 0.8, QTo: 0.6,
    JTs: 1, J9s: 0.7, J8s: 0.5,
    JTo: 0.6,
    T9s: 0.8, T8s: 0.6,
    '98s': 0.7, '87s': 0.6, '76s': 0.5, '65s': 0.4, '54s': 0.3,
  },
  MP: {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 0.8,
    '66': 0.6, '55': 0.5, '44': 0.3, '33': 0.2,
    AKs: 1, AQs: 1, AJs: 1, ATs: 1, A9s: 1, A8s: 0.9, A7s: 0.8,
    A6s: 0.75, A5s: 1, A4s: 0.8, A3s: 0.7, A2s: 0.6,
    AKo: 1, AQo: 1, AJo: 1, ATo: 0.9, A9o: 0.65,
    KQs: 1, KJs: 1, KTs: 1, K9s: 0.9, K8s: 0.6, K7s: 0.5,
    KQo: 1, KJo: 0.9, KTo: 0.75,
    QJs: 1, QTs: 1, Q9s: 0.8, Q8s: 0.6,
    QJo: 0.9, QTo: 0.7,
    JTs: 1, J9s: 0.8, J8s: 0.6,
    JTo: 0.7,
    T9s: 0.9, T8s: 0.7,
    '98s': 0.8, '87s': 0.7, '76s': 0.6, '65s': 0.5, '54s': 0.4,
  },
  HJ: {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 1,
    '66': 0.8, '55': 0.7, '44': 0.5, '33': 0.4, '22': 0.3,
    AKs: 1, AQs: 1, AJs: 1, ATs: 1, A9s: 1, A8s: 1, A7s: 0.9,
    A6s: 0.85, A5s: 1, A4s: 0.9, A3s: 0.8, A2s: 0.7,
    AKo: 1, AQo: 1, AJo: 1, ATo: 1, A9o: 0.8, A8o: 0.6,
    KQs: 1, KJs: 1, KTs: 1, K9s: 0.95, K8s: 0.75, K7s: 0.6, K6s: 0.5,
    KQo: 1, KJo: 1, KTo: 0.85, K9o: 0.6,
    QJs: 1, QTs: 1, Q9s: 0.9, Q8s: 0.75, Q7s: 0.5,
    QJo: 1, QTo: 0.8, Q9o: 0.55,
    JTs: 1, J9s: 0.9, J8s: 0.7, J7s: 0.5,
    JTo: 0.85, J9o: 0.6,
    T9s: 1, T8s: 0.85, T7s: 0.6,
    T9o: 0.65, T8o: 0.5,
    '98s': 0.9, '97s': 0.7, '96s': 0.5,
    '87s': 0.8, '86s': 0.6, '76s': 0.75, '65s': 0.7, '54s': 0.6, '43s': 0.4,
  },
  CO: {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 1,
    '66': 1, '55': 0.9, '44': 0.7, '33': 0.6, '22': 0.5,
    AKs: 1, AQs: 1, AJs: 1, ATs: 1, A9s: 1, A8s: 1, A7s: 1,
    A6s: 1, A5s: 1, A4s: 1, A3s: 0.9, A2s: 0.85,
    AKo: 1, AQo: 1, AJo: 1, ATo: 1, A9o: 1, A8o: 0.8, A7o: 0.6,
    KQs: 1, KJs: 1, KTs: 1, K9s: 1, K8s: 0.9, K7s: 0.75, K6s: 0.65, K5s: 0.5,
    KQo: 1, KJo: 1, KTo: 1, K9o: 0.8, K8o: 0.6,
    QJs: 1, QTs: 1, Q9s: 1, Q8s: 0.85, Q7s: 0.65,
    QJo: 1, QTo: 0.95, Q9o: 0.75, Q8o: 0.5,
    JTs: 1, J9s: 1, J8s: 0.85, J7s: 0.65,
    JTo: 0.95, J9o: 0.75, J8o: 0.55,
    T9s: 1, T8s: 1, T7s: 0.75,
    T9o: 0.8, T8o: 0.65,
    '98s': 1, '97s': 0.8, '96s': 0.65,
    '98o': 0.65, '87s': 0.95, '86s': 0.75, '76s': 0.9, '75s': 0.65,
    '65s': 0.85, '64s': 0.6, '54s': 0.8, '53s': 0.6, '43s': 0.55,
  },
  BTN: {
    // BTN opens ~44% of hands (very wide)
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 1,
    '66': 1, '55': 1, '44': 1, '33': 1, '22': 1,
    AKs: 1, AQs: 1, AJs: 1, ATs: 1, A9s: 1, A8s: 1, A7s: 1,
    A6s: 1, A5s: 1, A4s: 1, A3s: 1, A2s: 1,
    AKo: 1, AQo: 1, AJo: 1, ATo: 1, A9o: 1, A8o: 1, A7o: 0.9, A6o: 0.7,
    A5o: 0.8, A4o: 0.6, A3o: 0.5, A2o: 0.4,
    KQs: 1, KJs: 1, KTs: 1, K9s: 1, K8s: 1, K7s: 0.9, K6s: 0.8, K5s: 0.7, K4s: 0.6, K3s: 0.5, K2s: 0.4,
    KQo: 1, KJo: 1, KTo: 1, K9o: 1, K8o: 0.85, K7o: 0.65, K6o: 0.5,
    QJs: 1, QTs: 1, Q9s: 1, Q8s: 1, Q7s: 0.85, Q6s: 0.7, Q5s: 0.6,
    QJo: 1, QTo: 1, Q9o: 0.9, Q8o: 0.7, Q7o: 0.5,
    JTs: 1, J9s: 1, J8s: 1, J7s: 0.85, J6s: 0.65,
    JTo: 1, J9o: 0.85, J8o: 0.7,
    T9s: 1, T8s: 1, T7s: 0.9, T6s: 0.7,
    T9o: 0.85, T8o: 0.7,
    '98s': 1, '97s': 0.95, '96s': 0.8, '95s': 0.6,
    '98o': 0.7, '87s': 1, '86s': 0.85, '85s': 0.65,
    '76s': 1, '75s': 0.8, '74s': 0.6,
    '65s': 1, '64s': 0.75, '63s': 0.55,
    '54s': 1, '53s': 0.8, '52s': 0.6,
    '43s': 0.85, '42s': 0.6, '32s': 0.65,
  },
  SB: {
    // SB opens ~30% (smaller than BTN due to BB left to act)
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 1,
    '66': 0.9, '55': 0.8, '44': 0.7, '33': 0.6, '22': 0.5,
    AKs: 1, AQs: 1, AJs: 1, ATs: 1, A9s: 1, A8s: 1, A7s: 0.9,
    A6s: 0.85, A5s: 1, A4s: 0.9, A3s: 0.8, A2s: 0.75,
    AKo: 1, AQo: 1, AJo: 1, ATo: 1, A9o: 0.85, A8o: 0.7,
    KQs: 1, KJs: 1, KTs: 1, K9s: 0.95, K8s: 0.8, K7s: 0.7, K6s: 0.6,
    KQo: 1, KJo: 1, KTo: 0.9, K9o: 0.75,
    QJs: 1, QTs: 1, Q9s: 0.9, Q8s: 0.75,
    QJo: 0.9, QTo: 0.8,
    JTs: 1, J9s: 0.9, J8s: 0.75,
    JTo: 0.8,
    T9s: 0.95, T8s: 0.8,
    '98s': 0.9, '87s': 0.85, '76s': 0.8, '65s': 0.75, '54s': 0.7,
  },
  BB: {}, // BB never RFI (only defense)
};

// ============================================================
// 3-BET RANGES (vs opens from different positions)
// ============================================================

/** Value 1.0 = always 3-bet, 0.5 = mixed */
export const THREE_BET_RANGES: Record<Position, Record<Position, Record<string, number>>> = {
  // Hero is in each position, 3-betting opens from villain's position
  BTN: {
    UTG: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1, AQs: 0.8, JJ: 0.7, AQo: 0.5, A5s: 0.7, KQs: 0.5 },
    HJ: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1, AQs: 0.9, JJ: 0.8, AQo: 0.6, A5s: 0.8, KQs: 0.6, TT: 0.5 },
    CO: { AA: 1, KK: 1, QQ: 1, JJ: 0.9, AKs: 1, AKo: 1, AQs: 1, AQo: 0.75, A5s: 0.9, A4s: 0.6, KQs: 0.7, TT: 0.65 },
    BTN: {}, // BTN vs BTN doesn't apply
    SB: {}, CO: {}, HJ: {}, MP: {}, 'UTG+1': {}, 'UTG+2': {}, BB: {},
  },
  CO: {
    UTG: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1, AQs: 0.7 },
    HJ: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1, AQs: 0.85, JJ: 0.65, A5s: 0.75 },
    CO: {}, BTN: {}, SB: {}, MP: {}, 'UTG+1': {}, 'UTG+2': {}, BB: {},
  },
  SB: {
    BTN: { AA: 1, KK: 1, QQ: 1, JJ: 0.8, TT: 0.6, AKs: 1, AQs: 1, AJs: 0.8, AKo: 1, AQo: 0.8, KQs: 0.7, A5s: 0.9, A4s: 0.7 },
    CO: { AA: 1, KK: 1, QQ: 1, JJ: 0.7, AKs: 1, AQs: 0.9, AKo: 1, A5s: 0.8 },
    HJ: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1, A5s: 0.7 },
    UTG: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    SB: {}, BTN: {}, MP: {}, 'UTG+1': {}, 'UTG+2': {}, BB: {},
  },
  BB: {
    BTN: { AA: 1, KK: 1, QQ: 1, JJ: 0.85, TT: 0.65, AKs: 1, AQs: 1, AJs: 0.85, AKo: 1, AQo: 0.85, KQs: 0.75, A5s: 1, A4s: 0.8, A3s: 0.7, '98s': 0.5, '87s': 0.5 },
    CO: { AA: 1, KK: 1, QQ: 1, JJ: 0.75, AKs: 1, AQs: 0.95, AKo: 1, AQo: 0.75, A5s: 0.9 },
    HJ: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1, AQs: 0.8, A5s: 0.8 },
    SB: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1, AQs: 0.9, AQo: 0.7, JJ: 0.7, A5s: 0.9 },
    UTG: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    'UTG+1': { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    'UTG+2': { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    MP: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    BB: {},
  },
  // Other positions have tighter 3-bet ranges
  HJ: {
    UTG: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    'UTG+1': { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    'UTG+2': { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    MP: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1, JJ: 0.5 },
    HJ: {}, CO: {}, BTN: {}, SB: {}, BB: {},
  },
  MP: {
    UTG: { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    'UTG+1': { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    'UTG+2': { AA: 1, KK: 1, QQ: 1, AKs: 1, AKo: 1 },
    MP: {}, HJ: {}, CO: {}, BTN: {}, SB: {}, BB: {},
  },
  'UTG+2': {
    UTG: { AA: 1, KK: 1, QQ: 0.8, AKs: 1, AKo: 1 },
    'UTG+1': { AA: 1, KK: 1, QQ: 0.8, AKs: 1, AKo: 1 },
    'UTG+2': {}, MP: {}, HJ: {}, CO: {}, BTN: {}, SB: {}, BB: {},
  },
  'UTG+1': {
    UTG: { AA: 1, KK: 1, QQ: 0.7, AKs: 1, AKo: 1 },
    'UTG+1': {}, 'UTG+2': {}, MP: {}, HJ: {}, CO: {}, BTN: {}, SB: {}, BB: {},
  },
  UTG: { UTG: {}, 'UTG+1': {}, 'UTG+2': {}, MP: {}, HJ: {}, CO: {}, BTN: {}, SB: {}, BB: {} },
};

// ============================================================
// BB DEFENSE RANGES (vs opens from each position)
// ============================================================
// Frequency = probability of defending (calling or 3-betting)

export const BB_DEFENSE_FREQ: Record<Position, number> = {
  SB: 0.68,    // Defend ~68% vs SB limp/raise
  BTN: 0.58,   // Defend ~58% vs BTN
  CO: 0.52,
  HJ: 0.48,
  MP: 0.44,
  'UTG+2': 0.42,
  'UTG+1': 0.40,
  UTG: 0.38,
  BB: 1,
};

// ============================================================
// HAND CATEGORY LOOKUPS
// ============================================================

export type PreflopHandCategory =
  | 'premium'        // AA, KK, QQ, AKs — always open/3-bet
  | 'strong'         // JJ, TT, AQs+, AKo — open almost always, 3-bet sometimes
  | 'medium-value'   // 99-77, AJs, KQs — open, rarely 3-bet
  | 'broadway'       // KTo, QJo, etc. — position-dependent
  | 'suited-conn'    // 87s, 65s — position dependent
  | 'speculative'    // 22-44, small suited aces — late position only
  | 'marginal'       // K2o, Q4o — mostly fold except BTN/SB
  | 'trash';         // 72o etc — always fold

export function classifyPreflopHand(canonical: string): PreflopHandCategory {
  if (['AA', 'KK', 'QQ'].includes(canonical) || canonical === 'AKs' || canonical === 'AKo') return 'premium';
  if (['JJ', 'TT', 'AQs', 'AJs', 'AQo'].includes(canonical)) return 'strong';
  if (['99', '88', '77', 'ATs', 'A9s', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs'].includes(canonical)) return 'medium-value';
  if (isBroadway(canonical)) return 'broadway';
  if (isSuitedConnector(canonical)) return 'suited-conn';
  if (isSpeculative(canonical)) return 'speculative';
  if (isMarginal(canonical)) return 'marginal';
  return 'trash';
}

function isBroadway(hand: string): boolean {
  const r1 = hand[0];
  const r2 = hand[1];
  const broadwayRanks = new Set(['T', 'J', 'Q', 'K', 'A']);
  return broadwayRanks.has(r1) && broadwayRanks.has(r2) && r1 !== r2;
}

function isSuitedConnector(hand: string): boolean {
  if (!hand.endsWith('s')) return false;
  const RANK_VAL: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  const diff = Math.abs((RANK_VAL[hand[0]] ?? 0) - (RANK_VAL[hand[1]] ?? 0));
  return diff <= 2;
}

function isSpeculative(hand: string): boolean {
  const pairs = new Set(['22', '33', '44', '55']);
  if (pairs.has(hand)) return true;
  // Small suited aces
  if (hand.endsWith('s') && hand[0] === 'A') return true;
  return false;
}

function isMarginal(hand: string): boolean {
  return hand.endsWith('o') && !isBroadway(hand) && !isSpeculative(hand);
}

/**
 * Get the RFI frequency for a hand at a given position.
 * Returns 0-1 (0 = never open, 1 = always open).
 */
export function getRFIFrequency(canonical: string, position: Position): number {
  const rangeMap = RFI_RANGES[position];
  return rangeMap?.[canonical] ?? 0;
}

/**
 * Should hero 3-bet this hand given their position and the raiser's position?
 * Returns frequency (0-1).
 */
export function get3BetFrequency(canonical: string, heroPos: Position, raiserPos: Position): number {
  const byRaiser = THREE_BET_RANGES[heroPos]?.[raiserPos];
  return byRaiser?.[canonical] ?? 0;
}

/**
 * Check if hero is in position vs villain.
 * In poker, IP = hero acts after villain postflop.
 */
export function isHeroInPosition(heroPos: Position, villainPos: Position): boolean {
  const POSITION_ORDER: Position[] = ['BB', 'SB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO', 'BTN'];
  const heroIdx = POSITION_ORDER.indexOf(heroPos);
  const villainIdx = POSITION_ORDER.indexOf(villainPos);
  // BTN is always IP postflop; BB is always OOP
  if (heroPos === 'BTN') return true;
  if (heroPos === 'BB' || heroPos === 'SB') return false;
  return heroIdx > villainIdx;
}

/**
 * Estimate hand's range equity for preflop (how well it does vs typical villain range).
 * Returns 0-1.
 */
export function getPreflopRangeEquity(canonical: string, position: Position, actionLine: string): number {
  const category = classifyPreflopHand(canonical);
  // Base equity by category
  const baseEquity: Record<PreflopHandCategory, number> = {
    premium: 0.70,
    strong: 0.58,
    'medium-value': 0.52,
    broadway: 0.47,
    'suited-conn': 0.45,
    speculative: 0.43,
    marginal: 0.41,
    trash: 0.35,
  };

  let eq = baseEquity[category] ?? 0.45;

  // Adjust for position (more position = more equity realized)
  const posBonus: Partial<Record<Position, number>> = { BTN: 0.04, CO: 0.02, HJ: 0.01 };
  eq += posBonus[position] ?? 0;

  // Adjust for pot type
  if (actionLine === 'vs-3bet') eq *= 0.80;
  if (actionLine === 'vs-4bet') eq *= 0.70;

  return Math.max(0.10, Math.min(0.90, eq));
}
