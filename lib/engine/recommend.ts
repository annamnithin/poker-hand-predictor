import type {
  HandScenarioInput,
  NormalizedScenario,
  RecommendationResult,
  EVBreakdown,
  OpponentProfile,
  PlayerStyle,
  GTOContext,
} from '@/lib/domain/types';
import { findStackBucket, inferActionLine, opponentStyleModifier } from '@/lib/ranges/range-lookup';
import { calculatePotOdds } from './pot-odds';
import { calculateEV } from './ev-calculator';
import { estimateEquity, getEquityRealizationFactor, estimateFoldEquity } from './equity';
import { calculateConfidence, assessInputCompleteness } from './confidence';
import { generateExplanation, generateBreakdownNotes } from './explanation';
import { evaluateBestHand, enrichDescription } from './hand-evaluator';
import { analyzeBoardTexture } from './board-texture';
import { computeSPR, getExploitativeAdjustments } from './gto-advisor';
import { canonicalize } from './preflop-charts';

// ============================================================
// RECOMMENDATION ENGINE — Main orchestrator
// ============================================================

function primaryOpponentStyle(opponents: OpponentProfile[]): PlayerStyle {
  if (opponents.length === 0) return 'unknown';
  if (opponents.length === 1) return opponents[0].style;
  return opponents.reduce((prev, curr) =>
    opponentStyleModifier(curr.style).rangeWidthMult >= opponentStyleModifier(prev.style).rangeWidthMult
      ? curr : prev
  ).style;
}

/**
 * Normalize raw user input into an abstraction-friendly scenario.
 */
export function normalizeScenario(input: HandScenarioInput): NormalizedScenario {
  const effectiveStack = Math.min(input.heroStack, input.villainStack);
  const bbSize = 1;
  const effectiveStackBB = effectiveStack / bbSize;
  const stackBucket = findStackBucket(effectiveStackBB);
  const actionLine = inferActionLine(
    input.street,
    input.actionHistory.map((a) => ({ action: a.action, actorPosition: a.actorPosition })),
    input.heroPosition
  );

  return {
    street: input.street,
    heroCards: input.heroCards,
    boardCards: input.boardCards,
    heroPosition: input.heroPosition,
    effectiveStackBB,
    potSizeBB: input.potSize / bbSize,
    amountToCallBB: input.amountToCall / bbSize,
    stackBucket,
    actionLine,
    opponentStyle: primaryOpponentStyle(input.opponents),
    opponentsLeft: input.opponentsLeft,
  };
}

/**
 * Generate a full recommendation for a hand scenario.
 */
export function generateRecommendation(input: HandScenarioInput): RecommendationResult {
  // Step 1: Normalize
  const scenario = normalizeScenario(input);

  // Step 2: Board & hand evaluation
  const board = analyzeBoardTexture(scenario.boardCards);
  const handEval = evaluateBestHand(scenario.heroCards, scenario.boardCards);
  const enrichedDesc = enrichDescription(handEval, scenario.boardCards);
  const spr = computeSPR(scenario.effectiveStackBB, scenario.potSizeBB);

  // Step 3: Equity estimation
  const equityResult = estimateEquity(scenario);
  const realizationFactor = getEquityRealizationFactor(scenario.street, scenario.heroPosition);

  // Step 4: Calculate EVs
  const ev = calculateEV(scenario);

  // Step 5: Build breakdown
  const potOdds = scenario.amountToCallBB > 0
    ? calculatePotOdds(scenario.potSizeBB, scenario.amountToCallBB)
    : 0;

  const foldEquityFraction = ev.bestRaiseFraction ?? ev.bestBetFraction ?? 0.5;
  const foldEquity = estimateFoldEquity(
    foldEquityFraction,
    scenario.opponentStyle,
    scenario.street,
    scenario.actionLine,
    board.wetness,
  );

  const breakdown: EVBreakdown = {
    potOdds: Math.round(potOdds * 10) / 10,
    heroEquity: Math.round(equityResult.equity * 1000) / 10,
    equityRealizationFactor: realizationFactor,
    foldEquity: Math.round(foldEquity * 100),
    villainContinueRange: equityResult.rangeLabel,
    notes: generateBreakdownNotes(ev, equityResult.mappingQuality, equityResult.method),
  };

  // Step 6: Build GTO context
  const exploit = getExploitativeAdjustments(scenario.opponentStyle, handEval.category, scenario.street);
  const isIP = isHeroInPosition(input.heroPosition);

  const gtoContext: GTOContext = {
    spr: Math.round(spr.spr * 10) / 10,
    sprCategory: spr.category,
    isIP,
    handDescription: enrichedDesc,
    handCategory: handEval.category,
    draws: handEval.draws.map((d) => ({
      type: d.type,
      description: d.description,
      outs: d.outs,
      equity: d.equity,
    })),
    boardTexture: scenario.boardCards.length >= 3 ? {
      wetness: board.wetness,
      flushTexture: board.flushTexture,
      connectedness: board.connectedness,
      pairStructure: board.pairStructure,
      description: board.description,
    } : undefined,
    exploitLabel: exploit.label !== 'Unknown opponent' ? exploit.label : undefined,
    exploitReasoning: scenario.opponentStyle !== 'unknown' ? exploit.reasoning : undefined,
    gtoFrequency: undefined,
  };

  // Step 7: Confidence
  const inputCompleteness = assessInputCompleteness({
    actionHistory: input.actionHistory,
    opponents: input.opponents,
  });

  const confidence = calculateConfidence({
    ev,
    mappingQuality: equityResult.mappingQuality,
    hasExplicitRange: input.opponents.some((o) => !!o.range),
    equityMethod: equityResult.method,
    inputCompleteness,
  });

  // Step 8: Explanation
  const explanation = generateExplanation(
    ev,
    breakdown,
    confidence,
    scenario.street,
    input.opponents,
    scenario.actionLine,
    gtoContext,
  );

  return {
    ev,
    confidence,
    explanation,
    abstractionNode: equityResult.rangeLabel !== 'unknown' ? equityResult.rangeLabel : null,
    mappingQuality: equityResult.mappingQuality,
    breakdown,
    gtoContext,
  };
}

/**
 * Heuristic: determine if hero is in position postflop.
 * BTN is always IP; BB and SB are always OOP; others depend on action.
 */
function isHeroInPosition(heroPos: string): boolean {
  if (heroPos === 'BTN') return true;
  if (heroPos === 'BB' || heroPos === 'SB') return false;
  // CO, HJ, MP, UTG — generally in position vs the blinds but not vs later positions
  // Approximation: treat late positions as IP
  return ['CO', 'HJ'].includes(heroPos);
}
