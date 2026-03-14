import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="space-y-8 py-4">
      {/* Hero section */}
      <div className="text-center space-y-4 py-8">
        <div className="text-5xl mb-2">♠♥♦♣</div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Solver Study
        </h1>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
          Enter a Texas Hold&apos;em cash-game hand and get solver-inspired recommendations.
          Built for post-session review and study — not real-time play.
        </p>
        <div className="pt-2">
          <Link href="/hand/new">
            <Button size="lg">Analyze a Hand</Button>
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-sm mb-1">EV Analysis</h3>
            <p className="text-xs text-slate-500">
              See expected value for fold, call, and raise with sizing suggestions.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold text-sm mb-1">Range-Based</h3>
            <p className="text-xs text-slate-500">
              Uses GTO-inspired precomputed ranges with opponent adjustments.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl mb-2">💾</div>
            <h3 className="font-semibold text-sm mb-1">Save & Review</h3>
            <p className="text-xs text-slate-500">
              Save hand scenarios to build your personal study library.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-5">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Disclaimer:</strong> This is a study/review tool using solver-inspired abstractions
            and sample range data. It is not a perfect GTO solver. Recommendations are approximate
            and should be used for learning, not as definitive strategy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
