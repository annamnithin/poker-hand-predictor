import type {
  HandScenarioInput,
  NormalizedScenario,
  RecommendationResult,
  EVBreakdown,
  OpponentProfile,
  PlayerStyle,
} from '@/lib/domain/types';
import { findStackBucket, inferActionLine, opponentStyleModifier } from '@/lib/ranges/range-lookup';
import { calculatePotOdds } from './pot-odds';
import { calculateEV } from './ev-calculator';
import { estimateEquity, getEquityRealizationFactor, estimateFoldEquity } from './equity';
import { calculateConfidence, assessInputCompleteness } from './confidence';
import { generateExplanation, generateBreakdownNotes } from './explanation';

/**
 * Pick the representative style from a list of opponents.
 * Uses the opponent with the widest range (highest rangeWidthMult) as the
 * conservative representative for equity calculations against the field.
 */
function primaryOpponentStyle(opponents: OpponentProfile[]): PlayerStyle {
  if (opponents.length === 0) return 'unknown';
  if (opponents.length === 1) return opponents[0].style;
  return opponents.reduce((prev, curr) =>
    opponentStyleModifier(curr.style).rangeWidthMult >= opponentStyleModifier(prev.style).rangeWidthMult
      ? curr : prev
  ).style;
}

// ============================================================
// RECOMMENDATION ENGINE — Main entry point
// ============================================================
// Orchestrates: normalization → equity estimation → EV calculation →
// confidence scoring → explanation generation

/**
 * Normalize raw user input into an abstraction-friendly scenario.
 * Maps numeric values to the nearest supported bucket.
 */
export function normalizeScenario(input: HandScenarioInput): NormalizedScenario {
  // Use the smaller of hero/villain stack as effective stack
  const effectiveStack = Math.min(input.heroStack, input.villainStack);

  // We need a big-blind size to normalize. For MVP, assume 1bb = 1 chip unit.
  // The user enters values in chips; we treat them as BB for calculation.
  // In a full app, the user would specify BB size.
  const bbSize = 1; // TODO: make configurable
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
 * This is the main entry point called by the API.
 */
export function generateRecommendation(input: HandScenarioInput): RecommendationResult {
  // Step 1: Normalize
  const scenario = normalizeScenario(input);

  // Step 2: Estimate equity
  const equityResult = estimateEquity(scenario);
  const realizationFactor = getEquityRealizationFactor(scenario.street, scenario.heroPosition);

  // Step 3: Calculate EVs
  const ev = calculateEV(scenario);

  // Step 4: Build breakdown
  const potOdds = calculatePotOdds(scenario.potSizeBB, scenario.amountToCallBB);
  const foldEquity = ev.bestRaiseFraction
    ? estimateFoldEquity(ev.bestRaiseFraction, scenario.opponentStyle, scenario.street, scenario.actionLine)
    : 0;

  const breakdown: EVBreakdown = {
    potOdds: Math.round(potOdds * 10) / 10,
    heroEquity: Math.round(equityResult.equity * 1000) / 10, // e.g. 0.55 → 55.0
    equityRealizationFactor: realizationFactor,
    foldEquity: Math.round(foldEquity * 100),
    villainContinueRange: equityResult.rangeLabel,
    notes: generateBreakdownNotes(ev, equityResult.mappingQuality, equityResult.method),
  };

  // Step 5: Calculate confidence
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

  // Step 6: Generate explanation
  const explanation = generateExplanation(
    ev,
    breakdown,
    confidence,
    scenario.street,
    input.opponents,
    scenario.actionLine
  );

  return {
    ev,
    confidence,
    explanation,
    abstractionNode: equityResult.rangeLabel !== 'unknown' ? equityResult.rangeLabel : null,
    mappingQuality: equityResult.mappingQuality,
    breakdown,
  };
}
