import type { Card } from '@/lib/domain/types';

// ============================================================
// BOARD TEXTURE ANALYZER
// Determines wetness, connectivity, and pair structure of board
// ============================================================

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export type FlushTexture = 'monotone' | 'two-flush' | 'rainbow';
export type Connectedness = 'connected' | 'semi-connected' | 'disconnected';
export type PairStructure = 'trips' | 'double-paired' | 'paired' | 'unpaired';
export type BoardHighCard = 'ace-high' | 'broadway' | 'middle' | 'low';
export type Wetness = 'very-wet' | 'wet' | 'semi-wet' | 'dry';

export interface BoardTexture {
  flushTexture: FlushTexture;
  connectedness: Connectedness;
  pairStructure: PairStructure;
  highCard: BoardHighCard;
  wetness: Wetness;
  hasStraightPossibility: boolean;
  hasFlushPossibility: boolean;
  description: string;
  cBetSizingMult: number;    // multiplier on standard sizing (1.0 = normal)
  cBetFreqMult: number;      // multiplier on c-bet frequency
}

/**
 * Analyze a board (3-5 cards) for texture properties.
 */
export function analyzeBoardTexture(boardCards: Card[]): BoardTexture {
  if (boardCards.length === 0) {
    return emptyTexture();
  }

  const ranks = boardCards.map((c) => RANK_VALUES[c[0]]).sort((a, b) => b - a);
  const suits = boardCards.map((c) => c[1]);
  const uniqueRanks = Array.from(new Set(ranks));
  const uniqueSuits = Array.from(new Set(suits));

  const flushTexture = getFlushTexture(suits);
  const pairStructure = getPairStructure(ranks);
  const connectedness = getConnectedness(uniqueRanks);
  const highCard = getHighCard(ranks[0]);
  const hasStraightPossibility = checkStraightPossibility(ranks, boardCards.length);
  const hasFlushPossibility = flushTexture !== 'rainbow';
  const wetness = computeWetness(flushTexture, connectedness, pairStructure, boardCards.length);

  const description = buildDescription(flushTexture, connectedness, pairStructure, highCard, wetness, boardCards);
  const { cBetSizingMult, cBetFreqMult } = getCBetAdjustments(wetness, pairStructure, highCard);

  return {
    flushTexture,
    connectedness,
    pairStructure,
    highCard,
    wetness,
    hasStraightPossibility,
    hasFlushPossibility,
    description,
    cBetSizingMult,
    cBetFreqMult,
  };
}

function emptyTexture(): BoardTexture {
  return {
    flushTexture: 'rainbow',
    connectedness: 'disconnected',
    pairStructure: 'unpaired',
    highCard: 'low',
    wetness: 'dry',
    hasStraightPossibility: false,
    hasFlushPossibility: false,
    description: 'Preflop',
    cBetSizingMult: 1.0,
    cBetFreqMult: 1.0,
  };
}

function getFlushTexture(suits: string[]): FlushTexture {
  const counts: Record<string, number> = {};
  for (const s of suits) counts[s] = (counts[s] || 0) + 1;
  const max = Math.max(...Object.values(counts));
  if (max >= 3) return 'monotone';
  if (max === 2) return 'two-flush';
  return 'rainbow';
}

function getPairStructure(sortedRanks: number[]): PairStructure {
  const counts: Record<number, number> = {};
  for (const r of sortedRanks) counts[r] = (counts[r] || 0) + 1;
  const vals = Object.values(counts).sort((a, b) => b - a);
  if (vals[0] >= 3) return 'trips';
  if (vals[0] === 2 && vals[1] === 2) return 'double-paired';
  if (vals[0] === 2) return 'paired';
  return 'unpaired';
}

function getConnectedness(uniqueRanks: number[]): Connectedness {
  if (uniqueRanks.length < 2) return 'disconnected';
  const sorted = [...uniqueRanks].sort((a, b) => a - b);
  // Look at the 3 lowest ranks on the flop for connectedness
  const flop3 = sorted.slice(0, 3);
  const maxGap = Math.max(...flop3.slice(1).map((r, i) => r - flop3[i]));
  const span = sorted[sorted.length - 1] - sorted[0];

  if (maxGap <= 2 && span <= 4) return 'connected';
  if (maxGap <= 3 && span <= 5) return 'semi-connected';
  return 'disconnected';
}

function getHighCard(topRank: number): BoardHighCard {
  if (topRank === 14) return 'ace-high';
  if (topRank >= 10) return 'broadway';
  if (topRank >= 7) return 'middle';
  return 'low';
}

function checkStraightPossibility(ranks: number[], boardLength: number): boolean {
  // Check if there are 3+ cards within a 5-card window
  const unique = Array.from(new Set(ranks));
  for (let high = 6; high <= 14; high++) {
    const window = [high - 4, high - 3, high - 2, high - 1, high];
    const count = window.filter((r) => unique.includes(r)).length;
    if (count >= 3) return true;
  }
  return false;
}

function computeWetness(
  flushTexture: FlushTexture,
  connectedness: Connectedness,
  pairStructure: PairStructure,
  boardLength: number,
): Wetness {
  let score = 0;
  if (flushTexture === 'monotone') score += 3;
  else if (flushTexture === 'two-flush') score += 2;

  if (connectedness === 'connected') score += 3;
  else if (connectedness === 'semi-connected') score += 1;

  // Paired boards are drier (harder to connect draws)
  if (pairStructure !== 'unpaired') score -= 1;

  if (score >= 5) return 'very-wet';
  if (score >= 3) return 'wet';
  if (score >= 1) return 'semi-wet';
  return 'dry';
}

function buildDescription(
  flushTexture: FlushTexture,
  connectedness: Connectedness,
  pairStructure: PairStructure,
  highCard: BoardHighCard,
  wetness: Wetness,
  boardCards: Card[],
): string {
  const parts: string[] = [];

  const ranks = boardCards.map((c) => c[0]).join('-');

  if (pairStructure === 'trips') parts.push('Trips board');
  else if (pairStructure === 'double-paired') parts.push('Double-paired board');
  else if (pairStructure === 'paired') parts.push('Paired board');

  const highLabel = highCard === 'ace-high' ? 'Ace-high' : highCard === 'broadway' ? 'Broadway' : highCard === 'middle' ? 'Mid' : 'Low';
  parts.push(`${highLabel}`);

  if (flushTexture === 'monotone') parts.push('monotone');
  else if (flushTexture === 'two-flush') parts.push('two-tone');
  else parts.push('rainbow');

  if (connectedness === 'connected') parts.push('connected');
  else if (connectedness === 'semi-connected') parts.push('semi-connected');

  const wetnessLabel = wetness === 'very-wet' ? '(very wet)' : wetness === 'wet' ? '(wet)' : wetness === 'dry' ? '(dry)' : '';
  if (wetnessLabel) parts.push(wetnessLabel);

  return parts.join(' ') + ` [${ranks}]`;
}

/**
 * Get c-bet sizing and frequency adjustments based on board texture.
 *
 * Dry boards:  bet bigger (polarized), more often
 * Wet boards:  bet smaller (protection), moderate freq
 * Monotone:    bet small, protect/denial
 * Paired:      bet larger (merged range)
 */
function getCBetAdjustments(wetness: Wetness, pairStructure: PairStructure, highCard: BoardHighCard): { cBetSizingMult: number; cBetFreqMult: number } {
  // Base adjustments by wetness
  const sizing: Record<Wetness, number> = {
    'dry': 1.2,       // larger on dry boards
    'semi-wet': 0.9,
    'wet': 0.75,      // smaller on wet boards
    'very-wet': 0.65, // protection sizing
  };
  const freq: Record<Wetness, number> = {
    'dry': 1.15,      // bet more often on dry
    'semi-wet': 1.0,
    'wet': 0.90,
    'very-wet': 0.80,
  };

  let sizingMult = sizing[wetness];
  let freqMult = freq[wetness];

  if (pairStructure === 'paired') {
    sizingMult += 0.1;  // slightly larger on paired boards
    freqMult *= 0.95;   // but slightly less often (harder to have top pair)
  }
  if (pairStructure === 'double-paired' || pairStructure === 'trips') {
    freqMult *= 0.75;   // much less often on very dry/static boards
  }
  if (highCard === 'ace-high') {
    freqMult *= 1.05;   // CB more on ace-high (continue range connects better)
  }
  if (highCard === 'low') {
    freqMult *= 0.90;   // low boards favor OOP caller's range
  }

  return { cBetSizingMult: sizingMult, cBetFreqMult: freqMult };
}

/**
 * Determine optimal bet sizing as fraction of pot given board texture.
 */
export function getOptimalBetSizing(
  wetness: Wetness,
  pairStructure: PairStructure,
  street: string,
  handCategory: string,
  hasDraws: boolean,
): number {
  // GTO-approximate sizing by board/street
  let base = 0.5; // 50% pot default

  // Dry boards: larger sizing works (less connected to opponent's range)
  if (wetness === 'dry') base = 0.65;
  else if (wetness === 'semi-wet') base = 0.50;
  else if (wetness === 'wet') base = 0.40;
  else if (wetness === 'very-wet') base = 0.33;

  // Paired boards: larger sizing (polarized)
  if (pairStructure === 'paired' || pairStructure === 'double-paired') base += 0.10;

  // Turn and river: larger sizing (fewer streets left)
  if (street === 'turn') base += 0.10;
  if (street === 'river') base += 0.20;

  // Value hands: bet bigger
  if (handCategory === 'monster') base = Math.min(0.80, base + 0.15);
  if (handCategory === 'strong') base = Math.min(0.70, base + 0.05);

  // Draws: smaller sizing (semi-bluff with protection)
  if (hasDraws) base = Math.max(0.33, base - 0.10);

  return Math.min(1.0, base);
}
