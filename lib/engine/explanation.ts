import type { EVResult, EVBreakdown, Street, PlayerStyle } from '@/lib/domain/types';

// ============================================================
// EXPLANATION — Human-readable recommendation explanations
// ============================================================

/**
 * Generate a plain-English explanation of the recommendation.
 */
export function generateExplanation(
  ev: EVResult,
  breakdown: EVBreakdown,
  confidence: number,
  street: Street,
  opponentStyle: PlayerStyle,
  actionLine?: string
): string {
  const parts: string[] = [];

  // If we're in a 3-bet or 4-bet pot, lead with that context
  const potContext = getActionLineContext(actionLine, ev.bestAction);
  if (potContext) parts.push(potContext);

  parts.push(getActionExplanation(ev, breakdown));
  parts.push(getEquityContext(breakdown));

  if (opponentStyle !== 'unknown') {
    parts.push(getOpponentContext(opponentStyle));
  }

  parts.push(getConfidenceContext(confidence));

  const streetNote = getStreetNote(street, ev.bestAction);
  if (streetNote) parts.push(streetNote);

  return parts.join(' ');
}

/**
 * Provide context about the aggression level of the pot.
 * 3-bet and 4-bet pots have fundamentally different dynamics than single-raised pots.
 */
function getActionLineContext(actionLine: string | undefined, bestAction: string): string | null {
  switch (actionLine) {
    case 'vs-3bet':
      if (bestAction === 'fold')
        return 'You are facing a 3-bet, which means villain has a strong, condensed range. Many hands that are opens become folds here.';
      if (bestAction === 'call')
        return 'Facing a 3-bet. Villain\'s range is narrow but you have sufficient equity to continue.';
      return 'Facing a 3-bet. You have a strong enough hand to 4-bet for value.';

    case '3bet-vs-open':
      if (bestAction === 'raise')
        return 'This is a 3-bet spot. Your hand is strong enough to re-raise for value and fold equity against the original raiser.';
      return 'This is a 3-bet opportunity, but flatting or folding may be better with this hand.';

    case 'vs-4bet':
      if (bestAction === 'fold')
        return 'You are facing a 4-bet — villain\'s range is extremely narrow (typically top 3-5% of hands). Only premium holdings can continue.';
      if (bestAction === 'call')
        return 'Facing a 4-bet with a hand strong enough to call. Villain\'s range is very narrow.';
      return 'Facing a 4-bet. Your hand is strong enough to 5-bet shove.';

    case '4bet':
      return 'This is a 4-bet spot. You are re-raising a 3-bettor, which requires a very strong or well-selected bluffing hand.';

    default:
      return null;
  }
}

function getActionExplanation(ev: EVResult, breakdown: EVBreakdown): string {
  const potOdds = breakdown.potOdds;
  const equity = breakdown.heroEquity;

  switch (ev.bestAction) {
    case 'fold':
      return `Folding is recommended because your estimated equity (${equity.toFixed(1)}%) is below the pot-odds threshold (${potOdds.toFixed(1)}%), making both calling and raising negative EV.`;
    case 'call':
      if (ev.evCall > ev.evRaise) {
        return `Calling is recommended because your estimated equity (${equity.toFixed(1)}%) exceeds the pot-odds requirement (${potOdds.toFixed(1)}%), and raising offers lower EV due to limited fold equity.`;
      }
      return `Calling is recommended because your equity (${equity.toFixed(1)}%) is above the pot-odds threshold (${potOdds.toFixed(1)}%), making it a profitable play.`;
    case 'raise':
      if (ev.bestRaiseFraction) {
        const pct = Math.round(ev.bestRaiseFraction * 100);
        return `Raising (${pct}% pot) is recommended because the combination of fold equity (${breakdown.foldEquity.toFixed(0)}%) and called equity makes it the highest-EV play.`;
      }
      return `Raising is recommended because fold equity combined with your equity when called produces the highest expected value.`;
  }
}

function getEquityContext(breakdown: EVBreakdown): string {
  const erf = breakdown.equityRealizationFactor;
  if (erf < 0.85) {
    return `Your equity realization is reduced (${(erf * 100).toFixed(0)}%) because you may face difficult decisions on later streets.`;
  }
  return `Your equity realization factor is ${(erf * 100).toFixed(0)}%.`;
}

function getOpponentContext(style: PlayerStyle): string {
  switch (style) {
    case 'TAG':
      return 'Against a tight-aggressive opponent, their continuing range is relatively strong.';
    case 'LAG':
      return 'Against a loose-aggressive opponent, they have a wider range which may include more bluffs.';
    case 'tight-passive':
      return 'Against a tight-passive opponent, their bets and calls tend to be strong, but they fold more to aggression.';
    case 'loose-passive':
      return 'Against a loose-passive opponent, they call widely but rarely raise, so bluff attempts have limited fold equity.';
    default:
      return '';
  }
}

function getConfidenceContext(confidence: number): string {
  if (confidence >= 80) return 'Confidence is high — the scenario maps well to known range data.';
  if (confidence >= 60) return 'Confidence is moderate — the scenario was mapped to the nearest abstraction bucket.';
  if (confidence >= 40) return 'Confidence is low — the recommendation relies on general heuristics rather than specific range data.';
  return 'Confidence is very low — input was limited and the recommendation uses broad approximations.';
}

function getStreetNote(street: Street, action: string): string | null {
  if (street === 'river' && action === 'call') return 'On the river, equity is fully realized since no more cards can change the outcome.';
  if (street === 'preflop' && action === 'raise') return 'Preflop raises benefit from fold equity and initiative for postflop play.';
  return null;
}

/**
 * Generate supplementary notes for the breakdown display.
 */
export function generateBreakdownNotes(
  ev: EVResult,
  mappingQuality: number,
  equityMethod: string
): string[] {
  const notes: string[] = [];

  if (mappingQuality < 0.5) {
    notes.push('The scenario was approximated to the nearest abstraction — accuracy may be limited.');
  }
  if (equityMethod === 'fallback') {
    notes.push('No precomputed range was found for this scenario. Equity is a rough estimate.');
  }
  if (equityMethod === 'hand-strength-table') {
    notes.push('Equity was estimated using a hand-strength lookup table rather than range-vs-range simulation.');
  }

  const evs = [ev.evFold, ev.evCall, ev.evRaise];
  const sorted = [...evs].sort((a, b) => b - a);
  if (sorted[0] - sorted[1] < 1) {
    notes.push('This is a close decision — the EVs of the top two options are very similar.');
  }

  return notes;
}
