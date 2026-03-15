import type { Card } from '@/lib/domain/types';

// ============================================================
// HAND EVALUATOR — 7-card best-hand detection + draw analysis
// ============================================================

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const RANK_NAMES: Record<number, string> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight',
  9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
};

export const HAND_RANKS = {
  HIGH_CARD: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3,
  STRAIGHT: 4, FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8,
} as const;
export type HandRank = typeof HAND_RANKS[keyof typeof HAND_RANKS];

export type HandCategory = 'monster' | 'strong' | 'medium' | 'weak-made' | 'draw-heavy' | 'air';

export interface HandEvaluation {
  rank: HandRank;
  rankName: string;
  description: string;
  category: HandCategory;
  tiebreaker: number[];
  handStrength: number;        // 0-1, absolute
  draws: DrawResult[];
  isNutDraw: boolean;
  drawEquity: number;          // additional equity from draws
  totalEquity: number;         // made + draw equity vs average range
}

export interface DrawResult {
  type: 'flush-draw' | 'nut-flush-draw' | 'oesd' | 'gutshot' | 'combo-draw' | 'backdoor-flush' | 'backdoor-straight';
  description: string;
  outs: number;
  equity: number;    // approximate equity contribution
  isNut: boolean;
}

function parseCard(card: Card): { rank: number; suit: string } {
  return { rank: RANK_VALUES[card[0]], suit: card[1] };
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map((c) => [first, ...c]),
    ...combinations(rest, k),
  ];
}

interface FiveCardResult {
  rank: HandRank;
  rankName: string;
  description: string;
  tiebreaker: number[];
}

function evaluate5(cards: Card[]): FiveCardResult {
  const parsed = cards.map(parseCard);
  const ranks = parsed.map((c) => c.rank).sort((a, b) => b - a);
  const suits = parsed.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Straight check
  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  if (uniqueRanks.length >= 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    }
    // Wheel A-2-3-4-5
    if (uniqueRanks[0] === 14 && uniqueRanks[1] === 5 &&
        uniqueRanks[2] === 4 && uniqueRanks[3] === 3 && uniqueRanks[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Count ranks
  const rcounts: Record<number, number> = {};
  for (const r of ranks) rcounts[r] = (rcounts[r] || 0) + 1;
  const entries = Object.entries(rcounts)
    .map(([r, c]) => ({ rank: parseInt(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (isFlush && isStraight) {
    const name = straightHigh === 14 ? 'Royal Flush' : 'Straight Flush';
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, rankName: name, description: straightHigh === 14 ? 'Royal Flush' : `${RANK_NAMES[straightHigh]}-high Straight Flush`, tiebreaker: [straightHigh] };
  }
  if (entries[0].count === 4) {
    return { rank: HAND_RANKS.QUADS, rankName: 'Four of a Kind', description: `Four ${RANK_NAMES[entries[0].rank]}s`, tiebreaker: [entries[0].rank, entries[1]?.rank ?? 0] };
  }
  if (entries[0].count === 3 && entries[1]?.count === 2) {
    return { rank: HAND_RANKS.FULL_HOUSE, rankName: 'Full House', description: `${RANK_NAMES[entries[0].rank]}s full of ${RANK_NAMES[entries[1].rank]}s`, tiebreaker: [entries[0].rank, entries[1].rank] };
  }
  if (isFlush) {
    return { rank: HAND_RANKS.FLUSH, rankName: 'Flush', description: `${RANK_NAMES[ranks[0]]}-high Flush`, tiebreaker: ranks };
  }
  if (isStraight) {
    return { rank: HAND_RANKS.STRAIGHT, rankName: 'Straight', description: `${RANK_NAMES[straightHigh]}-high Straight`, tiebreaker: [straightHigh] };
  }
  if (entries[0].count === 3) {
    return { rank: HAND_RANKS.TRIPS, rankName: 'Three of a Kind', description: `Trip ${RANK_NAMES[entries[0].rank]}s`, tiebreaker: [entries[0].rank, entries[1]?.rank ?? 0, entries[2]?.rank ?? 0] };
  }
  if (entries[0].count === 2 && entries[1]?.count === 2) {
    const h = Math.max(entries[0].rank, entries[1].rank);
    const l = Math.min(entries[0].rank, entries[1].rank);
    return { rank: HAND_RANKS.TWO_PAIR, rankName: 'Two Pair', description: `${RANK_NAMES[h]}s and ${RANK_NAMES[l]}s`, tiebreaker: [h, l, entries[2]?.rank ?? 0] };
  }
  if (entries[0].count === 2) {
    return { rank: HAND_RANKS.PAIR, rankName: 'Pair', description: `Pair of ${RANK_NAMES[entries[0].rank]}s`, tiebreaker: [entries[0].rank, ...entries.slice(1).map((e) => e.rank)] };
  }
  return { rank: HAND_RANKS.HIGH_CARD, rankName: 'High Card', description: `${RANK_NAMES[ranks[0]]}-high`, tiebreaker: ranks };
}

function compareResult(a: FiveCardResult, b: FiveCardResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tiebreaker.length, b.tiebreaker.length); i++) {
    const d = (a.tiebreaker[i] ?? 0) - (b.tiebreaker[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function getHandStrength(rank: HandRank): number {
  const base: Record<HandRank, number> = {
    [HAND_RANKS.STRAIGHT_FLUSH]: 0.99,
    [HAND_RANKS.QUADS]: 0.97,
    [HAND_RANKS.FULL_HOUSE]: 0.93,
    [HAND_RANKS.FLUSH]: 0.85,
    [HAND_RANKS.STRAIGHT]: 0.80,
    [HAND_RANKS.TRIPS]: 0.72,
    [HAND_RANKS.TWO_PAIR]: 0.58,
    [HAND_RANKS.PAIR]: 0.38,
    [HAND_RANKS.HIGH_CARD]: 0.12,
  };
  return base[rank] ?? 0.5;
}

function getCategory(rank: HandRank, entries: Array<{ rank: number; count: number }>, boardCards: Card[]): HandCategory {
  if (rank >= HAND_RANKS.FULL_HOUSE) return 'monster';
  if (rank === HAND_RANKS.FLUSH || rank === HAND_RANKS.STRAIGHT || rank === HAND_RANKS.TRIPS) return 'strong';
  if (rank === HAND_RANKS.TWO_PAIR) {
    const pairs = entries.filter((e) => e.count === 2).sort((a, b) => b.rank - a.rank);
    // Top two pair on an unpaired board is 'strong'
    if (pairs.length >= 2 && pairs[0].rank >= 10) return 'strong';
    return 'medium';
  }
  if (rank === HAND_RANKS.PAIR) {
    const pairRank = entries[0].rank;
    // Overpair (pair rank > board cards) is medium+
    const boardRanks = boardCards.map((c) => RANK_VALUES[c[0]]);
    const maxBoard = boardRanks.length > 0 ? Math.max(...boardRanks) : 0;
    if (pairRank > maxBoard) return 'medium'; // overpair
    if (pairRank === maxBoard) return 'medium'; // top pair
    if (pairRank >= 9) return 'weak-made'; // mid pair
    return 'weak-made';
  }
  return 'air';
}

/**
 * Evaluate the best 5-card hand from hero cards + board.
 * Works for preflop (no board), flop (3), turn (4), river (5).
 */
export function evaluateBestHand(heroCards: Card[], boardCards: Card[]): HandEvaluation {
  const allCards = [...heroCards, ...boardCards];

  let best: FiveCardResult;
  if (allCards.length >= 5) {
    const combos = combinations(allCards, 5);
    best = combos.reduce((b, c) => {
      const r = evaluate5(c);
      return compareResult(r, b) > 0 ? r : b;
    }, evaluate5(combos[0]));
  } else {
    // Preflop / incomplete — evaluate what we have (2-4 cards)
    // Fill to 5 with placeholder low cards for ranking purposes
    const fillerNeeded = 5 - allCards.length;
    const filler: Card[] = (['2c', '3d', '4h', '5s', '6c'] as Card[]).slice(0, fillerNeeded);
    best = evaluate5([...allCards, ...filler]);
  }

  const draws = boardCards.length >= 3 ? detectDraws(heroCards, boardCards) : [];
  const drawEquity = draws.reduce((sum, d) => sum + d.equity, 0);
  const madStrength = getHandStrength(best.rank);
  const totalEquity = Math.min(0.99, madStrength + drawEquity * (1 - madStrength));
  const isNutDraw = draws.some((d) => d.isNut);

  // Parse rank count entries for category
  const allParsed = allCards.map(parseCard);
  const rcounts: Record<number, number> = {};
  for (const p of allParsed) rcounts[p.rank] = (rcounts[p.rank] || 0) + 1;
  const entries = Object.entries(rcounts)
    .map(([r, c]) => ({ rank: parseInt(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  let category = getCategory(best.rank, entries, boardCards);
  if (category === 'air' && draws.length > 0) {
    category = 'draw-heavy';
  }

  return {
    rank: best.rank,
    rankName: best.rankName,
    description: best.description,
    category,
    tiebreaker: best.tiebreaker,
    handStrength: madStrength,
    draws,
    isNutDraw,
    drawEquity: Math.min(0.5, drawEquity),
    totalEquity,
  };
}

/**
 * Detect draws in hero's hand given current board.
 */
export function detectDraws(heroCards: Card[], boardCards: Card[]): DrawResult[] {
  if (boardCards.length < 3) return [];

  const allCards = [...heroCards, ...boardCards];
  const allParsed = allCards.map(parseCard);
  const heroParsed = heroCards.map(parseCard);
  const heroRanks = heroParsed.map((c) => c.rank);
  const heroSuits = heroParsed.map((c) => c.suit);

  const draws: DrawResult[] = [];

  // --- Flush draws ---
  const suitGroups: Record<string, { total: number; heroCount: number; maxRank: number }> = {};
  for (const p of allParsed) {
    if (!suitGroups[p.suit]) suitGroups[p.suit] = { total: 0, heroCount: 0, maxRank: 0 };
    suitGroups[p.suit].total++;
    suitGroups[p.suit].maxRank = Math.max(suitGroups[p.suit].maxRank, p.rank);
  }
  for (const hp of heroParsed) {
    if (suitGroups[hp.suit]) suitGroups[hp.suit].heroCount++;
  }

  for (const [suit, g] of Object.entries(suitGroups)) {
    if (g.heroCount === 0) continue;
    const isNut = g.maxRank === 14 && heroSuits.includes(suit);
    if (g.total === 4) {
      const isFlushDraw = boardCards.length <= 4;
      if (isFlushDraw) {
        draws.push({
          type: isNut ? 'nut-flush-draw' : 'flush-draw',
          description: isNut ? 'Nut flush draw' : 'Flush draw',
          outs: 9,
          equity: boardCards.length === 3 ? 0.36 : 0.20,
          isNut,
        });
      }
    } else if (g.total === 3 && boardCards.length === 3) {
      draws.push({
        type: 'backdoor-flush',
        description: 'Backdoor flush draw',
        outs: 0,
        equity: 0.04,
        isNut,
      });
    }
  }

  // --- Straight draws ---
  const allRanks = Array.from(new Set(allParsed.map((p) => p.rank))).sort((a, b) => a - b);
  // Include ace as 1 for wheel
  if (allRanks.includes(14)) allRanks.unshift(1);

  const hasOESD = checkOESD(allRanks, heroRanks);
  const hasGutshot = !hasOESD && checkGutshot(allRanks, heroRanks);

  if (hasOESD) {
    draws.push({
      type: 'oesd',
      description: 'Open-ended straight draw',
      outs: 8,
      equity: boardCards.length === 3 ? 0.32 : 0.17,
      isNut: false,
    });
  }
  if (hasGutshot) {
    draws.push({
      type: 'gutshot',
      description: 'Gutshot straight draw',
      outs: 4,
      equity: boardCards.length === 3 ? 0.17 : 0.09,
      isNut: false,
    });
  }
  if (!hasOESD && !hasGutshot && boardCards.length === 3) {
    if (checkBackdoorStraight(allRanks, heroRanks)) {
      draws.push({
        type: 'backdoor-straight',
        description: 'Backdoor straight draw',
        outs: 0,
        equity: 0.03,
        isNut: false,
      });
    }
  }

  // Upgrade to combo draw
  const hasFlushDraw = draws.some((d) => d.type === 'flush-draw' || d.type === 'nut-flush-draw');
  const hasStraightDraw = draws.some((d) => d.type === 'oesd' || d.type === 'gutshot');
  if (hasFlushDraw && hasStraightDraw) {
    const nutFlush = draws.some((d) => d.type === 'nut-flush-draw');
    const oesd = draws.some((d) => d.type === 'oesd');
    const filtered = draws.filter((d) => !['flush-draw', 'nut-flush-draw', 'oesd', 'gutshot'].includes(d.type));
    filtered.unshift({
      type: 'combo-draw',
      description: `Combo draw (${nutFlush ? 'nut ' : ''}flush + ${oesd ? 'OESD' : 'gutshot'})`,
      outs: oesd ? 15 : 12,
      equity: boardCards.length === 3 ? (oesd ? 0.55 : 0.45) : (oesd ? 0.32 : 0.27),
      isNut: nutFlush,
    });
    return filtered;
  }

  return draws;
}

function checkOESD(allRanks: number[], heroRanks: number[]): boolean {
  for (let high = 6; high <= 14; high++) {
    const needed = [high - 3, high - 2, high - 1, high];
    if (needed.every((r) => allRanks.includes(r))) {
      // Make sure hero contributes at least one card
      if (heroRanks.some((r) => needed.includes(r))) return true;
    }
  }
  return false;
}

function checkGutshot(allRanks: number[], heroRanks: number[]): boolean {
  for (let high = 6; high <= 14; high++) {
    const window = [high - 4, high - 3, high - 2, high - 1, high];
    const present = window.filter((r) => allRanks.includes(r));
    if (present.length === 4) {
      if (heroRanks.some((r) => present.includes(r))) return true;
    }
  }
  return false;
}

function checkBackdoorStraight(allRanks: number[], heroRanks: number[]): boolean {
  for (let high = 6; high <= 14; high++) {
    const window = [high - 4, high - 3, high - 2, high - 1, high];
    const present = window.filter((r) => allRanks.includes(r));
    if (present.length === 3) {
      if (heroRanks.some((r) => present.includes(r))) return true;
    }
  }
  return false;
}

/**
 * Enrich hand description with board context.
 * E.g. "top pair top kicker", "overpair", "middle set", etc.
 */
export function enrichDescription(eval_: HandEvaluation, boardCards: Card[]): string {
  if (boardCards.length === 0) return eval_.description;
  const boardRanks = boardCards.map((c) => RANK_VALUES[c[0]]).sort((a, b) => b - a);
  const maxBoard = boardRanks[0];

  if (eval_.rank === HAND_RANKS.PAIR) {
    const pairRank = eval_.tiebreaker[0];
    if (pairRank > maxBoard) return `Overpair (${RANK_NAMES[pairRank]}s)`;
    if (pairRank === maxBoard) {
      const kicker = eval_.tiebreaker[1];
      const kickerLabel = kicker >= 14 ? 'ace' : kicker >= 12 ? 'queen+' : kicker >= 10 ? 'ten+' : 'weak';
      return `Top pair (${RANK_NAMES[pairRank]}s), ${kickerLabel} kicker`;
    }
    if (pairRank === boardRanks[1]) return `Middle pair (${RANK_NAMES[pairRank]}s)`;
    return `Bottom pair (${RANK_NAMES[pairRank]}s)`;
  }
  if (eval_.rank === HAND_RANKS.TRIPS) {
    const tripRank = eval_.tiebreaker[0];
    const isSet = boardRanks.filter((r) => r === tripRank).length === 1; // board has 1, hero has pair
    return isSet ? `Set of ${RANK_NAMES[tripRank]}s` : `Trip ${RANK_NAMES[tripRank]}s`;
  }
  if (eval_.rank === HAND_RANKS.FULL_HOUSE) {
    const isBoat = `Full house, ${RANK_NAMES[eval_.tiebreaker[0]]}s over ${RANK_NAMES[eval_.tiebreaker[1]]}s`;
    return isBoat;
  }
  return eval_.description;
}
