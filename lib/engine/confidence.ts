import type { EVResult } from '@/lib/domain/types';

// ============================================================
// CONFIDENCE — Score how trustworthy the recommendation is
// ============================================================

interface ConfidenceInputs {
  ev: EVResult;
  mappingQuality: number;       // 0-1
  hasExplicitRange: boolean;
  equityMethod: string;
  inputCompleteness: number;    // 0-1
}

/**
 * Calculate a confidence score from 0 to 100.
 */
export function calculateConfidence(inputs: ConfidenceInputs): number {
  const { ev, mappingQuality, hasExplicitRange, equityMethod, inputCompleteness } = inputs;

  let score = 50;

  // Factor 1: EV separation (0-25 points)
  const evs = [ev.evFold, ev.evCall, ev.evRaise].sort((a, b) => b - a);
  const evGap = evs[0] - evs[1];

  if (evGap > 20) score += 25;
  else if (evGap > 10) score += 20;
  else if (evGap > 5) score += 15;
  else if (evGap > 2) score += 10;
  else if (evGap > 0.5) score += 5;
  else score -= 5;

  // Factor 2: Mapping quality (0-20 points)
  score += Math.round(mappingQuality * 20);

  // Factor 3: Range source (0-15 points)
  if (hasExplicitRange) score += 15;
  else if (equityMethod === 'range-lookup') score += 10;
  else if (equityMethod === 'hand-strength-table') score += 5;

  // Factor 4: Input completeness (0-10 points)
  score += Math.round(inputCompleteness * 10);

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate input completeness based on what the user provided.
 */
export function assessInputCompleteness(input: {
  actionHistory: unknown[];
  opponents: Array<{ style: string; range?: string }>;
}): number {
  let completeness = 0.5;

  if (input.actionHistory.length > 0) completeness += 0.2;
  if (input.opponents.some((o) => o.range)) completeness += 0.15;
  if (input.opponents.some((o) => o.style !== 'unknown')) completeness += 0.15;

  return Math.min(1, completeness);
}
