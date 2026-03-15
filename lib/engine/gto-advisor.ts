import type { Position, PlayerStyle, Street } from '@/lib/domain/types';
import type { HandEvaluation } from './hand-evaluator';
import type { BoardTexture, Wetness } from './board-texture';
import { getOptimalBetSizing } from './board-texture';
import { getRFIFrequency, get3BetFrequency, isHeroInPosition } from './preflop-charts';

// ============================================================
// GTO ADVISOR — SPR, position-aware, exploitative adjustments
// ============================================================

export type GtoAction = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export interface GTODecision {
  action: GtoAction;
  sizingFraction?: number;      // as fraction of pot (for bet/raise)
  mixFrequency?: number;        // 0-1, how often to take this action (GTO mixing)
  alternativeAction?: GtoAction;
  alternativeSizing?: number;
  reasoning: string[];
  isExploitative: boolean;
  exploitLabel?: string;        // e.g., "Bluffing more vs tight-passive"
}

export interface SPRInfo {
  spr: number;
  category: 'micro' | 'low' | 'medium' | 'deep';
  commitment: 'pot-committed' | 'semi-committed' | 'uncommitted';
  description: string;
}

export interface GTOContext {
  spr: SPRInfo;
  isIP: boolean;
  hasPositionAdvantage: boolean;
  shouldCbet: boolean;
  cbetFrequency: number;        // 0-1
  cbetSizingFraction: number;   // fraction of pot
  checkRaiseThreshold: boolean; // should consider check-raise
  checkBackFrequency: number;   // how often to check back in position
  multiWayPotPenalty: number;   // equity penalty for multiway (0 = no penalty)
}

// ============================================================
// SPR CALCULATION
// ============================================================

export function computeSPR(effectiveStack: number, pot: number): SPRInfo {
  const spr = pot > 0 ? effectiveStack / pot : Infinity;

  let category: SPRInfo['category'];
  let commitment: SPRInfo['commitment'];
  let description: string;

  if (spr <= 2) {
    category = 'micro';
    commitment = 'pot-committed';
    description = `SPR ${spr.toFixed(1)} — pot-committed; commit with top pair or better`;
  } else if (spr <= 4) {
    category = 'low';
    commitment = 'pot-committed';
    description = `SPR ${spr.toFixed(1)} — semi-committed; top pair+ is a stack-off`;
  } else if (spr <= 10) {
    category = 'medium';
    commitment = 'semi-committed';
    description = `SPR ${spr.toFixed(1)} — medium depth; need two pair+ to felt`;
  } else {
    category = 'deep';
    commitment = 'uncommitted';
    description = `SPR ${spr.toFixed(1)} — deep stacked; need strong made hand or nut draws`;
  }

  return { spr, category, commitment, description };
}

// ============================================================
// POSITION ANALYSIS
// ============================================================

export function analyzePosition(heroPos: Position, opponents: Position[]): boolean {
  // If no opponent positions given, use heuristic
  const postflopOOP = ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2'];
  const isOOP = postflopOOP.includes(heroPos);
  return !isOOP;
}

// ============================================================
// C-BET DECISION
// ============================================================

/**
 * Should hero continuation-bet given hand strength and board texture?
 * Returns recommended action and sizing for the preflop aggressor.
 */
export function getCBetDecision(
  handEval: HandEvaluation,
  board: BoardTexture,
  spr: SPRInfo,
  isIP: boolean,
  opponentsLeft: number,
  actionLine: string,
): { shouldCbet: boolean; freq: number; sizingFraction: number } {
  const { category, draws } = handEval;
  const hasDraws = draws.length > 0;

  // Base c-bet frequency from board texture
  let freq = board.cBetFreqMult;
  let sizing = getOptimalBetSizing(board.wetness, board.pairStructure, 'flop', category, hasDraws);

  // Position adjustment
  if (!isIP) {
    freq *= 0.80;   // bet less OOP
    sizing *= 0.90;
  }

  // Multiway pot: tighten significantly
  if (opponentsLeft > 1) {
    freq *= Math.max(0.3, 1 - (opponentsLeft - 1) * 0.25);
    // Need stronger hands to c-bet multiway
    if (category === 'air' || category === 'weak-made') freq = 0;
  }

  // Hand strength adjustments
  if (category === 'monster' || category === 'strong') {
    freq = Math.min(1.0, freq * 1.1);  // bet more with strong hands
    sizing = Math.min(1.0, sizing * 1.1);
  } else if (category === 'medium') {
    // Standard frequency
  } else if (category === 'draw-heavy') {
    freq *= 1.0;  // semi-bluff with draws at standard freq
    sizing *= 0.85; // smaller sizing on draws
  } else if (category === 'air') {
    freq *= 0.4;  // bluff air less often (mixed strategy)
  } else if (category === 'weak-made') {
    freq *= 0.7;  // weak made hands often check/call
  }

  // SPR adjustments
  if (spr.category === 'micro') {
    freq = Math.min(1.0, freq * 1.2); // commit more when SPR is low
    sizing = 1.0;
  }

  // 3-bet pots: slightly higher c-bet frequency (range advantage)
  if (actionLine === '3bet-vs-open' || actionLine === '4bet') {
    freq *= 1.10;
  }

  const shouldCbet = freq >= 0.50;
  return { shouldCbet, freq: Math.min(1, Math.max(0, freq)), sizingFraction: sizing };
}

// ============================================================
// CHECK-RAISE DECISION
// ============================================================

export function shouldCheckRaise(
  handEval: HandEvaluation,
  board: BoardTexture,
  spr: SPRInfo,
): boolean {
  const { category, draws } = handEval;
  const hasNutDraw = draws.some((d) => d.isNut);
  const hasComboDraw = draws.some((d) => d.type === 'combo-draw');

  // Strong made hands: always check-raise candidate
  if (category === 'monster' || category === 'strong') return true;
  // Nut draws or combo draws: good check-raise bluffs
  if (hasNutDraw || hasComboDraw) return true;
  // Medium pair + good draw = check-raise
  if (category === 'medium' && draws.length > 0) return true;

  // Wet boards: more check-raise opportunities
  if (board.wetness === 'very-wet' || board.wetness === 'wet') {
    if (category === 'medium') return true;
  }

  return false;
}

// ============================================================
// PREFLOP GTO DECISION
// ============================================================

export interface PreflopGTODecision {
  action: GtoAction;
  sizing?: number;   // as pot fraction (for raises) or absolute
  frequency: number; // mix frequency
  reasoning: string[];
}

export function getPreflopGTODecision(
  canonical: string,
  heroPosition: Position,
  actionLine: string,
  opponentPosition: Position | null,
  amountToCall: number,
  potSize: number,
  effectiveStack: number,
): PreflopGTODecision {
  const reasoning: string[] = [];

  // Case 1: No one has entered — RFI spot
  if (actionLine === 'open' || amountToCall === 0) {
    const rfiFreq = getRFIFrequency(canonical, heroPosition);
    if (rfiFreq >= 0.75) {
      reasoning.push(`${canonical} is a strong open from ${heroPosition} (RFI freq: ${(rfiFreq * 100).toFixed(0)}%)`);
      return { action: 'raise', sizing: 2.5, frequency: rfiFreq, reasoning };
    } else if (rfiFreq >= 0.40) {
      reasoning.push(`${canonical} is a mixed open from ${heroPosition} — GTO raise ${(rfiFreq * 100).toFixed(0)}% of the time`);
      return { action: 'raise', sizing: 2.5, frequency: rfiFreq, reasoning };
    } else {
      reasoning.push(`${canonical} is below the RFI threshold from ${heroPosition} — fold`);
      return { action: 'fold', frequency: 1 - rfiFreq, reasoning };
    }
  }

  // Case 2: Facing open raise — 3-bet or call or fold
  if ((actionLine === 'call-vs-open' || actionLine === '3bet-vs-open') && opponentPosition) {
    const threeBetFreq = get3BetFrequency(canonical, heroPosition, opponentPosition);
    const potOdds = amountToCall / (potSize + amountToCall);

    if (threeBetFreq >= 0.75) {
      reasoning.push(`${canonical} is a strong 3-bet from ${heroPosition} vs ${opponentPosition}`);
      // Standard 3-bet sizing: ~3x the open (BB-based) or 9-12 BB over open
      const size3Bet = Math.min(effectiveStack * 0.25, amountToCall * 3);
      return { action: 'raise', sizing: size3Bet, frequency: threeBetFreq, reasoning };
    }

    // Call with hands that have good implied odds / equity
    if (potOdds < 0.30 && isHandWorthCalling(canonical, opponentPosition)) {
      reasoning.push(`${canonical} has sufficient equity to call vs ${opponentPosition}'s range (pot odds ${(potOdds * 100).toFixed(0)}%)`);
      return { action: 'call', frequency: 1 - threeBetFreq, reasoning };
    }

    reasoning.push(`${canonical} is a fold vs ${opponentPosition} open from ${heroPosition}`);
    return { action: 'fold', frequency: 1, reasoning };
  }

  // Case 3: Facing 3-bet (vs-3bet)
  if (actionLine === 'vs-3bet') {
    const potOdds = amountToCall / (potSize + amountToCall);
    const is4BetCandidate = isPremiumHand(canonical);
    if (is4BetCandidate) {
      reasoning.push(`${canonical} is a 4-bet for value vs the 3-bet`);
      return { action: 'raise', sizing: amountToCall * 2.3, frequency: 1, reasoning };
    }
    if (potOdds < 0.25 && isHandWorthCalling(canonical, null)) {
      reasoning.push(`${canonical} calls the 3-bet with implied odds`);
      return { action: 'call', frequency: 0.7, reasoning };
    }
    reasoning.push(`${canonical} folds to the 3-bet — not enough equity vs condensed range`);
    return { action: 'fold', frequency: 1, reasoning };
  }

  // Case 4: Facing 4-bet
  if (actionLine === 'vs-4bet') {
    if (isPremiumHand(canonical)) {
      reasoning.push(`${canonical} is a call/5-bet shove vs the 4-bet`);
      return { action: 'call', frequency: 1, reasoning };
    }
    reasoning.push(`${canonical} folds to the 4-bet — villain's range is very narrow`);
    return { action: 'fold', frequency: 1, reasoning };
  }

  // Fallback
  reasoning.push('Unable to determine precise preflop action');
  return { action: amountToCall > 0 ? 'fold' : 'check', frequency: 1, reasoning };
}

function isPremiumHand(canonical: string): boolean {
  return ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'AQs'].includes(canonical);
}

function isHandWorthCalling(canonical: string, raiserPos: Position | null): boolean {
  const callingHands = new Set([
    'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'AQo', 'AJo', 'ATo',
    'KQs', 'KJs', 'KTs', 'KQo', 'KJo',
    'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s', '65s', '54s',
  ]);
  return callingHands.has(canonical);
}

// ============================================================
// EXPLOITATIVE ADJUSTMENTS
// ============================================================

export interface ExploitativeAdjustment {
  actionDelta: number;          // positive = lean toward aggression, negative = lean passive
  sizingDelta: number;          // multiplier on sizing (e.g., 0.8 = smaller, 1.2 = larger)
  bluffFreqMult: number;        // multiplier on bluff frequency
  valueThresholdMult: number;   // multiplier on value threshold (lower = thinner value)
  foldThresholdMult: number;    // multiplier on fold threshold (higher = fold more)
  label: string;
  reasoning: string;
}

export function getExploitativeAdjustments(
  opponentStyle: PlayerStyle,
  handCategory: string,
  street: Street,
): ExploitativeAdjustment {
  switch (opponentStyle) {
    case 'loose-passive':
      // Fish/calling stations: value bet thin, never bluff
      return {
        actionDelta: 0.3,         // lean toward betting
        sizingDelta: 1.1,         // bet slightly bigger (they call anyway)
        bluffFreqMult: 0.15,      // almost never bluff
        valueThresholdMult: 0.8,  // lower value threshold (bet thinner)
        foldThresholdMult: 0.8,   // they fold less so fold threshold is lower
        label: 'vs Loose-Passive',
        reasoning: 'Calling station: value bet all pairs+, avoid bluffing, size up slightly for max value.',
      };

    case 'tight-passive':
      // Nit: steal frequently, fold to their aggression
      return {
        actionDelta: 0.5,         // steal often
        sizingDelta: 0.85,        // smaller sizing (they fold to small bets)
        bluffFreqMult: 1.8,       // bluff more (they fold often)
        valueThresholdMult: 1.1,  // need stronger hand to value bet (they only call with good hands)
        foldThresholdMult: 1.3,   // fold more to their aggression
        label: 'vs Tight-Passive',
        reasoning: 'Nit: steal blinds and pots frequently, bet smaller, fold to significant aggression.',
      };

    case 'LAG':
      // Loose-aggressive: trap with strong hands, don't bluff, call wider
      return {
        actionDelta: -0.2,        // lean passive (let them bluff)
        sizingDelta: 1.0,
        bluffFreqMult: 0.5,       // bluff less (they call too wide)
        valueThresholdMult: 0.9,  // value bet slightly thinner
        foldThresholdMult: 0.7,   // fold less (they're bluffing more)
        label: 'vs LAG',
        reasoning: 'Loose-aggressive: trap with strong hands, call wider, reduce bluff frequency.',
      };

    case 'TAG':
      // Regular/TAG: balanced GTO play with slight adjustments
      return {
        actionDelta: 0,
        sizingDelta: 1.0,
        bluffFreqMult: 0.9,
        valueThresholdMult: 1.0,
        foldThresholdMult: 1.0,
        label: 'vs TAG',
        reasoning: 'TAG opponent: play near-GTO, slightly reduce bluff frequency, respect their aggression.',
      };

    default:
      return {
        actionDelta: 0,
        sizingDelta: 1.0,
        bluffFreqMult: 1.0,
        valueThresholdMult: 1.0,
        foldThresholdMult: 1.0,
        label: 'Unknown opponent',
        reasoning: 'Unknown opponent tendencies — defaulting to GTO baseline.',
      };
  }
}

// ============================================================
// MULTIWAY POT ADJUSTMENTS
// ============================================================

/**
 * Adjust equity and action thresholds for multiway pots.
 * With more players, you need stronger hands to bet/raise.
 */
export function getMultiwayPenalty(opponentsLeft: number): number {
  if (opponentsLeft <= 1) return 1.0;
  if (opponentsLeft === 2) return 0.90;  // 3-way: slight penalty
  if (opponentsLeft === 3) return 0.80;  // 4-way: significant
  return Math.max(0.60, 1 - (opponentsLeft - 1) * 0.10);
}

// ============================================================
// MAIN GTO DECISION FUNCTION (Postflop)
// ============================================================

export function getPostflopGTODecision(
  handEval: HandEvaluation,
  board: BoardTexture,
  spr: SPRInfo,
  isIP: boolean,
  opponentsLeft: number,
  street: Street,
  actionLine: string,
  opponentStyle: PlayerStyle,
  amountToCall: number,
  potSize: number,
): GTODecision {
  const reasoning: string[] = [];
  const exploit = getExploitativeAdjustments(opponentStyle, handEval.category, street);
  const multiWayPenalty = getMultiwayPenalty(opponentsLeft);
  const adjustedStrength = handEval.handStrength * multiWayPenalty;
  const { category, draws } = handEval;
  const hasDraws = draws.length > 0;

  // Add context
  if (opponentsLeft > 1) {
    reasoning.push(`Multiway pot (${opponentsLeft + 1} players) — tighten value range`);
  }
  if (!isIP) reasoning.push('OOP — prefer checking marginal hands, protect value');
  reasoning.push(spr.description);

  // Facing a bet: call, raise, or fold
  if (amountToCall > 0) {
    return decideFacingBet(handEval, board, spr, isIP, opponentsLeft, street, actionLine, opponentStyle, amountToCall, potSize, reasoning, exploit, adjustedStrength);
  }

  // No bet to face: check or bet
  return decideCheckOrBet(handEval, board, spr, isIP, opponentsLeft, street, actionLine, opponentStyle, potSize, reasoning, exploit, adjustedStrength);
}

function decideFacingBet(
  handEval: HandEvaluation,
  board: BoardTexture,
  spr: SPRInfo,
  isIP: boolean,
  opponentsLeft: number,
  street: Street,
  actionLine: string,
  opponentStyle: PlayerStyle,
  amountToCall: number,
  potSize: number,
  reasoning: string[],
  exploit: ExploitativeAdjustment,
  adjustedStrength: number,
): GTODecision {
  const potOdds = amountToCall / (potSize + amountToCall);
  const totalEquity = handEval.totalEquity;
  const { category } = handEval;
  const checkRaiseCandidate = shouldCheckRaise(handEval, board, spr);

  // Raise / check-raise threshold
  const raiseThreshold = 0.60 * exploit.valueThresholdMult;
  if (adjustedStrength >= raiseThreshold || (checkRaiseCandidate && !isIP)) {
    const sizingFraction = Math.min(1.5, getOptimalBetSizing(board.wetness, board.pairStructure, 'flop', category, handEval.draws.length > 0));
    if (checkRaiseCandidate && !isIP) reasoning.push(`Strong hand OOP — check-raise for value/protection`);
    else reasoning.push(`${category} hand — raise for value`);
    return { action: 'raise', sizingFraction, mixFrequency: 1.0, reasoning, isExploitative: opponentStyle !== 'unknown', exploitLabel: exploit.label };
  }

  // Call threshold: equity > pot odds (+ exploitative adjustment)
  const callThreshold = potOdds * exploit.foldThresholdMult;
  if (totalEquity >= callThreshold || (adjustedStrength >= 0.35 && totalEquity >= potOdds * 0.8)) {
    if (handEval.draws.length > 0) reasoning.push(`Drawing hand — calling with ${totalEquity >= 0.33 ? 'good' : 'marginal'} implied odds`);
    else reasoning.push(`Calling with ${(totalEquity * 100).toFixed(0)}% equity vs ${(potOdds * 100).toFixed(0)}% required`);
    return { action: 'call', mixFrequency: 1.0, reasoning, isExploitative: opponentStyle !== 'unknown', exploitLabel: exploit.label };
  }

  // Fold
  reasoning.push(`Folding — insufficient equity (${(totalEquity * 100).toFixed(0)}%) vs pot odds (${(potOdds * 100).toFixed(0)}%)`);
  return { action: 'fold', mixFrequency: 1.0, reasoning, isExploitative: false };
}

function decideCheckOrBet(
  handEval: HandEvaluation,
  board: BoardTexture,
  spr: SPRInfo,
  isIP: boolean,
  opponentsLeft: number,
  street: Street,
  actionLine: string,
  opponentStyle: PlayerStyle,
  potSize: number,
  reasoning: string[],
  exploit: ExploitativeAdjustment,
  adjustedStrength: number,
): GTODecision {
  const { category, draws } = handEval;
  const hasDraws = draws.length > 0;

  // Get c-bet recommendation
  const cbet = getCBetDecision(handEval, board, spr, isIP, opponentsLeft, actionLine);

  // Value threshold for betting (exploitably adjusted)
  const valueThreshold = 0.45 * exploit.valueThresholdMult;
  const bluffOK = Math.random() < (0.35 * exploit.bluffFreqMult); // stochastic bluff decision

  if (adjustedStrength >= valueThreshold && cbet.shouldCbet) {
    const sizingFraction = cbet.sizingFraction * exploit.sizingDelta;
    reasoning.push(`Betting for value: ${category} hand on ${board.wetness} board`);
    if (!isIP) reasoning.push('OOP bet — protect hand and deny equity');
    return {
      action: 'bet',
      sizingFraction,
      mixFrequency: cbet.freq,
      alternativeAction: 'check',
      alternativeSizing: 0,
      reasoning,
      isExploitative: opponentStyle !== 'unknown',
      exploitLabel: exploit.label,
    };
  }

  if (hasDraws && cbet.shouldCbet) {
    const sizingFraction = cbet.sizingFraction * 0.85;
    reasoning.push(`Semi-bluffing with ${draws.map((d) => d.description).join(', ')}`);
    return {
      action: 'bet',
      sizingFraction,
      mixFrequency: cbet.freq * 0.8,
      alternativeAction: 'check',
      reasoning,
      isExploitative: opponentStyle !== 'unknown',
      exploitLabel: exploit.label,
    };
  }

  if (bluffOK && category === 'air' && isIP && board.wetness === 'dry') {
    const sizingFraction = cbet.sizingFraction;
    reasoning.push(`Bluffing on dry board IP — fold equity is high`);
    return {
      action: 'bet',
      sizingFraction,
      mixFrequency: 0.3 * exploit.bluffFreqMult,
      alternativeAction: 'check',
      reasoning,
      isExploitative: true,
      exploitLabel: exploit.label,
    };
  }

  // Check (default when no bet warranted)
  if (isIP && (category === 'weak-made' || category === 'medium')) {
    reasoning.push(`Check back in position — preserve weak/medium hand`);
  } else if (!isIP) {
    reasoning.push(`Check OOP — protect range, allow bluff-catching`);
  } else {
    reasoning.push(`Check — hand not strong enough to value bet or semi-bluff here`);
  }

  return {
    action: 'check',
    mixFrequency: 1.0,
    alternativeAction: hasDraws ? 'bet' : undefined,
    reasoning,
    isExploitative: false,
  };
}
