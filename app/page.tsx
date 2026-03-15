import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-16 py-4">
      {/* Hero section */}
      <div className="text-center space-y-6 py-12">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-700 mb-2">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          Solver-Inspired Hand Analysis
        </div>
        <h1
          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Master Your Poker Game
          <br />
          <span className="text-emerald-600">One Hand at a Time</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
          Get solver-inspired EV analysis, range-based recommendations, and detailed breakdowns for
          every Texas Hold&apos;em hand you play.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/hand/new"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300"
          >
            Analyze a Hand — Free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/hands"
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-8 py-3.5 rounded-xl text-sm transition-all hover:bg-slate-50"
          >
            View Saved Hands
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 bg-slate-900 rounded-2xl p-6 text-center">
        {[
          { value: '169', label: 'Hand Combinations' },
          { value: '3', label: 'EV Actions Scored' },
          { value: '9', label: 'Positions Covered' },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          Everything You Need to Study Smarter
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '📊', title: 'EV Analysis', desc: 'See exact expected value for fold, call, and raise with optimal sizing recommendations.' },
            { icon: '🎯', title: 'Range-Based Engine', desc: 'GTO-inspired precomputed ranges with opponent adjustments for TAG, LAG, and passive players.' },
            { icon: '💾', title: 'Hand History', desc: 'Save every hand to build your personal study library. Filter by street, position, or action.' },
            { icon: '🧠', title: 'Confidence Scoring', desc: 'Know how reliable each recommendation is based on range mapping quality and input completeness.' },
            { icon: '👥', title: 'Multi-Opponent', desc: 'Model up to 8 opponents with individual play styles and custom ranges per opponent.' },
            { icon: '⚡', title: 'Instant Results', desc: 'Get full breakdowns in milliseconds — pot odds, equity, fold equity, and more.' },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-emerald-200 hover:shadow-md transition-all">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-sm text-slate-900 mb-1">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Enter Your Hand', desc: 'Input your cards, position, stack sizes, and the action history from your session.' },
            { step: '2', title: 'Get Analysis', desc: 'Our engine calculates EV for every action using range-based heuristics and opponent modeling.' },
            { step: '3', title: 'Study & Improve', desc: 'Save hands, review decisions, and track your improvement over time.' },
          ].map((s) => (
            <div key={s.step} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900 mb-1">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 pb-4">
        <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
          Ready to Level Up?
        </h2>
        <p className="text-slate-500 text-sm">Analyze your first hand in under 30 seconds.</p>
        <Link
          href="/hand/new"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-200"
        >
          Start Analyzing Free
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="border border-amber-200 bg-amber-50 rounded-xl px-5 py-4">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Disclaimer:</strong> PokerEdge uses solver-inspired abstractions and precomputed ranges for educational purposes.
          It is not a real-time GTO solver. Recommendations are approximate and intended for post-session study and improvement, not real-time in-game advice.
        </p>
      </div>
    </div>
  );
}
