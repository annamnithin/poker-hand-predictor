import { getHand } from '@/server/repositories/hand-repository';
import { ResultPanel } from '@/components/poker/result-panel';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import type { HandScenarioInput, RecommendationResult, Card as CardType, ActionHistoryEntry, EVBreakdown } from '@/lib/domain/types';

export default async function HandDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const hand = await getHand(params.id);

  if (!hand) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Hand not found.</p>
        <Link href="/hands" className="text-emerald-600 hover:underline text-sm mt-2 block">
          Back to saved hands
        </Link>
      </div>
    );
  }

  const rec = hand.recommendation;
  if (!rec) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No recommendation found for this hand.</p>
      </div>
    );
  }

  // Reconstruct the input and result objects from DB data
  const input: HandScenarioInput = {
    street: hand.street as HandScenarioInput['street'],
    heroCards: hand.heroCards as [CardType, CardType],
    boardCards: hand.boardCards as CardType[],
    totalPlayers: hand.totalPlayers,
    heroPosition: hand.heroPosition as HandScenarioInput['heroPosition'],
    potSize: hand.potSize,
    amountToCall: hand.amountToCall,
    heroStack: hand.heroStack,
    villainStack: hand.villainStack,
    opponentsLeft: hand.opponentsLeft,
    opponentStyle: hand.opponentStyle as HandScenarioInput['opponentStyle'],
    opponentRange: hand.opponentRange ?? undefined,
    actionHistory: (hand.actionHistory as ActionHistoryEntry[]) ?? [],
  };

  const result: RecommendationResult = {
    ev: {
      evFold: rec.evFold,
      evCall: rec.evCall,
      evRaise: rec.evRaise,
      bestAction: rec.recommendedAction as 'fold' | 'call' | 'raise',
      bestRaiseSizing: rec.raiseSizing,
      bestRaiseFraction: null,
    },
    confidence: rec.confidence,
    explanation: rec.explanation,
    abstractionNode: rec.abstractionNode,
    mappingQuality: rec.mappingQuality,
    breakdown: rec.breakdown as EVBreakdown,
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Saved Hand
        </h1>
        <Link
          href="/hands"
          className="text-sm text-slate-500 hover:text-emerald-600 transition-colors"
        >
          &larr; All Hands
        </Link>
      </div>
      <p className="text-xs text-slate-400">
        Saved {new Date(hand.createdAt).toLocaleDateString()} at{' '}
        {new Date(hand.createdAt).toLocaleTimeString()}
      </p>
      <ResultPanel result={result} input={input} />
    </div>
  );
}
