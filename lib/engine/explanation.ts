import type { EVResult, EVBreakdown, Street, PlayerStyle, GTOContext } from '@/lib/domain/types';

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
  opponents: Array<{ style: PlayerStyle; range?: string }>,
  actionLine?: string,
  gtoContext?: GTOContext,
): string {
  const parts: string[] = [];

  // 1. Action-line context (3-bet/4-bet pots)
  const potContext = getActionLineContext(actionLine, ev.bestAction);
  if (potContext) parts.push(potContext);

  // 2. GTO hand context
  if (gtoContext && street !== 'preflop') {
    const handCtx = getHandContext(gtoContext);
    if (handCtx) parts.push(handCtx);
  }

  // 3. Core action explanation
  parts.push(getActionExplanation(ev, breakdown, gtoContext));

  // 4. Equity context
  if (street !== 'preflop' || breakdown.heroEquity < 45 || breakdown.heroEquity > 65) {
    parts.push(getEquityContext(breakdown, ev.bestAction));
  }

  // 5. Board texture (postflop)
  if (gtoContext?.boardTexture && street !== 'preflop') {
    const boardNote = getBoardTextureNote(gtoContext.boardTexture, ev.bestAction);
    if (boardNote) parts.push(boardNote);
  }

  // 6. Draw info (postflop)
  if (gtoContext?.draws && gtoContext.draws.length > 0 && street !== 'preflop') {
    parts.push(getDrawNote(gtoContext.draws));
  }

  // 7. SPR / commitment note
  if (gtoContext?.spr !== undefined && street !== 'preflop') {
    const sprNote = getSPRNote(gtoContext.spr, gtoContext.sprCategory, ev.bestAction);
    if (sprNote) parts.push(sprNote);
  }

  // 8. Position note
  if (gtoContext?.isIP !== undefined && street !== 'preflop') {
    parts.push(gtoContext.isIP ? 'You have position — use it to control pot size.' : 'You are OOP — defensive lines have more merit here.');
  }

  // 9. Opponent context
  const knownOpponents = opponents.filter((o) => o.style !== 'unknown');
  if (knownOpponents.length === 1) {
    parts.push(getOpponentContext(knownOpponents[0].style));
  } else if (knownOpponents.length > 1) {
    parts.push(getMultiOpponentContext(knownOpponents.map((o) => o.style)));
  }

  // 10. Exploitative note
  if (gtoContext?.exploitReasoning) {
    parts.push(`Exploitative adjustment: ${gtoContext.exploitReasoning}`);
  }

  // 11. Confidence
  parts.push(getConfidenceContext(confidence));

  // 12. Street-specific note
  const streetNote = getStreetNote(street, ev.bestAction);
  if (streetNote) parts.push(streetNote);

  return parts.join(' ');
}

function getHandContext(ctx: GTOContext): string {
  if (ctx.handDescription && ctx.handCategory) {
    const catLabel: Record<string, string> = {
      monster: 'a monster',
      strong: 'a strong hand',
      medium: 'a medium-strength hand',
      'weak-made': 'a weak made hand',
      'draw-heavy': 'a drawing hand',
      air: 'air (no made hand)',
    };
    return `You have ${ctx.handDescription} — ${catLabel[ctx.handCategory] ?? ctx.handCategory}.`;
  }
  return '';
}

function getActionExplanation(ev: EVResult, breakdown: EVBreakdown, ctx?: GTOContext): string {
  const potOdds = breakdown.potOdds;
  const equity = breakdown.heroEquity;

  switch (ev.bestAction) {
    case 'fold':
      return `Folding is best — your estimated equity (${equity.toFixed(1)}%) falls below the pot-odds requirement (${potOdds.toFixed(1)}%), making continuing a losing play.`;
    case 'check':
      return `Checking is the GTO play here — your hand does not meet the value-bet threshold on this board, and a bluff offers insufficient fold equity.`;
    case 'call':
      if (ev.evCall > ev.evRaise) {
        return `Calling is preferred over raising — your equity (${equity.toFixed(1)}%) exceeds pot odds (${potOdds.toFixed(1)}%), but raising generates insufficient fold equity to be profitable.`;
      }
      return `Calling is correct — your equity (${equity.toFixed(1)}%) comfortably exceeds the pot-odds requirement (${potOdds.toFixed(1)}%).`;
    case 'bet': {
      const pct = ev.bestBetFraction ? Math.round(ev.bestBetFraction * 100) : 50;
      return `Betting ${pct}% pot is the highest-EV play — you generate fold equity while protecting a strong hand and building a pot you expect to win.`;
    }
    case 'raise': {
      const pct = ev.bestRaiseFraction ? Math.round(ev.bestRaiseFraction * 100) : 66;
      return `Raising (${pct}% pot) maximizes EV — fold equity (${breakdown.foldEquity.toFixed(0)}%) combined with your equity when called (${equity.toFixed(1)}%) makes this the best play.`;
    }
  }
}

function getEquityContext(breakdown: EVBreakdown, action: string): string {
  const erf = breakdown.equityRealizationFactor;
  if (erf < 0.85) {
    return `Equity realization is reduced (${(erf * 100).toFixed(0)}%) — position and future streets affect how much of your equity you capture.`;
  }
  return `Equity realization factor: ${(erf * 100).toFixed(0)}%.`;
}

function getBoardTextureNote(board: GTOContext['boardTexture'], action: string): string | null {
  if (!board) return null;
  const { wetness, description } = board;
  if (wetness === 'very-wet' || wetness === 'wet') {
    return `Board is wet (${description}) — draw-heavy texture favors smaller sizing and balanced ranges.`;
  }
  if (wetness === 'dry') {
    return `Dry board (${description}) — opponents connect less; larger bets and higher frequencies are appropriate.`;
  }
  return `Board texture: ${description}.`;
}

function getDrawNote(draws: GTOContext['draws']): string {
  if (!draws || draws.length === 0) return '';
  const best = draws[0];
  const equity = (best.equity * 100).toFixed(0);
  return `You have a ${best.description} (~${equity}% additional equity) — semi-bluffing options are available.`;
}

function getSPRNote(spr: number, category: string | undefined, action: string): string | null {
  if (spr > 10) return null;
  if (category === 'micro' || spr <= 2) return `Very low SPR (${spr.toFixed(1)}) — effectively pot-committed; top pair or better is a stack-off.`;
  if (category === 'low' || spr <= 4) return `Low SPR (${spr.toFixed(1)}) — top pair is a stack-off. Prioritize getting chips in.`;
  return `SPR ${spr.toFixed(1)} — need two pair or better to commit full stacks.`;
}

function getActionLineContext(actionLine: string | undefined, bestAction: string): string | null {
  switch (actionLine) {
    case 'vs-3bet':
      if (bestAction === 'fold') return 'Facing a 3-bet — villain\'s range is condensed and strong. Many open-raise hands become folds.';
      if (bestAction === 'call') return 'Facing a 3-bet — you have sufficient equity and implied odds to continue.';
      return 'Facing a 3-bet with a hand strong enough to 4-bet for value.';
    case '3bet-vs-open':
      if (bestAction === 'raise') return 'Strong 3-bet spot — re-raise for value and deny equity to the original raiser.';
      return 'This is a potential 3-bet spot; flatting preserves disguise with this hand.';
    case 'vs-4bet':
      if (bestAction === 'fold') return 'Facing a 4-bet — villain\'s range is extremely narrow (top 3-5% of hands). Only premiums continue.';
      if (bestAction === 'call') return 'Facing a 4-bet — your hand retains enough equity vs the very narrow 4-betting range.';
      return 'Facing a 4-bet — your hand justifies a 5-bet shove.';
    case '4bet':
      return '4-bet spot — re-raising the 3-bet requires a strong value hand or a well-chosen bluff.';
    default:
      return null;
  }
}

function getMultiOpponentContext(styles: PlayerStyle[]): string {
  return `Multiway pot (${styles.length} opponents) — tighten your value range significantly and reduce bluff frequency.`;
}

function getOpponentContext(style: PlayerStyle): string {
  switch (style) {
    case 'TAG': return 'vs TAG: play near-GTO; reduce bluff frequency slightly and respect their aggression.';
    case 'LAG': return 'vs LAG: let them bluff into you; call wider with made hands, trap with monsters.';
    case 'tight-passive': return 'vs Nit: steal frequently with smaller bets; fold to their significant aggression (they rarely bluff).';
    case 'loose-passive': return 'vs Fish: bet every strong hand for max value; avoid bluffing (they call too wide).';
    default: return '';
  }
}

function getConfidenceContext(confidence: number): string {
  if (confidence >= 80) return 'Confidence is high — scenario maps well to known GTO ranges.';
  if (confidence >= 60) return 'Confidence is moderate — scenario approximates known solver data.';
  if (confidence >= 40) return 'Confidence is lower — recommendation relies on heuristics.';
  return 'Confidence is low — use these approximations with caution.';
}

function getStreetNote(street: Street, action: string): string | null {
  if (street === 'river' && (action === 'call' || action === 'fold')) return 'On the river, equity is fully realized — decisions are final with no future cards.';
  if (street === 'preflop' && action === 'raise') return 'Preflop raises take initiative and apply fold pressure while building a pot from a range-advantaged position.';
  if (street === 'turn' && action === 'bet') return 'Turn bets apply maximum pressure — opponents face a tough decision with only one card remaining.';
  return null;
}

/**
 * Generate supplementary notes for the breakdown display.
 */
export function generateBreakdownNotes(
  ev: EVResult,
  mappingQuality: number,
  equityMethod: string,
): string[] {
  const notes: string[] = [];

  if (equityMethod === 'board-eval') {
    notes.push('Equity estimated via actual hand evaluation against villain\'s estimated range.');
  } else if (mappingQuality < 0.5) {
    notes.push('Scenario approximated to nearest abstraction — accuracy may be limited.');
  }
  if (equityMethod === 'fallback') {
    notes.push('No precomputed range found. Equity is a rough heuristic estimate.');
  }

  const allEvs = [ev.evFold, ev.evCall, ev.evRaise, ev.evCheck, ev.evBet].filter((v) => v > 0);
  if (allEvs.length >= 2) {
    allEvs.sort((a, b) => b - a);
    if (allEvs[0] - allEvs[1] < 1.0) {
      notes.push('Close decision — top two options have very similar EV. Table reads may tip the balance.');
    }
  }

  return notes;
}
