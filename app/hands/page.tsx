import { listHands } from '@/server/repositories/hand-repository';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { formatCard } from '@/lib/utils/card-display';
import type { Card as CardType } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

export default async function SavedHandsPage({
  searchParams,
}: {
  searchParams: { street?: string; position?: string; action?: string };
}) {
  const hands = await listHands({
    street: searchParams.street,
    position: searchParams.position,
    action: searchParams.action,
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Saved Hands
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {hands.length} hand{hands.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <FilterLink href="/hands" label="All" active={!searchParams.street && !searchParams.action} />
        <FilterLink href="/hands?street=preflop" label="Preflop" active={searchParams.street === 'preflop'} />
        <FilterLink href="/hands?street=flop" label="Flop" active={searchParams.street === 'flop'} />
        <FilterLink href="/hands?street=turn" label="Turn" active={searchParams.street === 'turn'} />
        <FilterLink href="/hands?street=river" label="River" active={searchParams.street === 'river'} />
        <span className="text-slate-300">|</span>
        <FilterLink href="/hands?action=fold" label="Fold" active={searchParams.action === 'fold'} />
        <FilterLink href="/hands?action=call" label="Call" active={searchParams.action === 'call'} />
        <FilterLink href="/hands?action=raise" label="Raise" active={searchParams.action === 'raise'} />
      </div>

      {/* Hands list */}
      {hands.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-center text-slate-500 py-12">
            <p>No saved hands yet.</p>
            <Link href="/hand/new" className="text-emerald-600 hover:underline text-sm mt-2 block">
              Analyze your first hand
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {hands.map((hand) => {
            const rec = hand.recommendation;
            return (
              <Link key={hand.id} href={`/hand/${hand.id}`}>
                <Card className="hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Cards display */}
                        <div className="font-mono text-sm font-bold text-slate-800">
                          {hand.heroCards.map((c) => formatCard(c as CardType)).join(' ')}
                        </div>
                        {hand.boardCards.length > 0 && (
                          <>
                            <span className="text-slate-300">|</span>
                            <div className="font-mono text-xs text-slate-500">
                              {hand.boardCards.map((c) => formatCard(c as CardType)).join(' ')}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {rec && (
                          <span
                            className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                              rec.recommendedAction === 'fold' && 'bg-red-100 text-red-700',
                              rec.recommendedAction === 'call' && 'bg-blue-100 text-blue-700',
                              rec.recommendedAction === 'raise' && 'bg-emerald-100 text-emerald-700'
                            )}
                          >
                            {rec.recommendedAction}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-slate-400">
                      <span className="capitalize">{hand.street}</span>
                      <span>{hand.heroPosition}</span>
                      <span>Pot: {hand.potSize}</span>
                      {rec && <span>Confidence: {rec.confidence}%</span>}
                      <span className="ml-auto">
                        {new Date(hand.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
        active
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      )}
    >
      {label}
    </Link>
  );
}
