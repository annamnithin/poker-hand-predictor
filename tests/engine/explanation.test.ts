import { describe, it, expect } from 'vitest';
import { generateExplanation, generateBreakdownNotes } from '@/lib/engine/explanation';
import type { EVResult, EVBreakdown } from '@/lib/domain/types';

const baseBreakdown: EVBreakdown = {
  potOdds: 33.3,
  heroEquity: 55.0,
  equityRealizationFactor: 0.85,
  foldEquity: 35,
  villainContinueRange: 'btn-open-100bb',
  notes: [],
};

describe('generateExplanation', () => {
  it('should generate explanation for call recommendation', () => {
    const ev: EVResult = {
      evFold: 0,
      evCall: 5.0,
      evRaise: 3.0,
      bestAction: 'call',
      bestRaiseSizing: 10,
      bestRaiseFraction: 0.5,
    };
    const explanation = generateExplanation(ev, baseBreakdown, 65, 'preflop', 'unknown');
    expect(explanation).toContain('Call');
    expect(explanation.length).toBeGreaterThan(50);
  });

  it('should generate explanation for raise recommendation', () => {
    const ev: EVResult = {
      evFold: 0,
      evCall: 3.0,
      evRaise: 8.0,
      bestAction: 'raise',
      bestRaiseSizing: 10,
      bestRaiseFraction: 0.5,
    };
    const explanation = generateExplanation(ev, baseBreakdown, 70, 'flop', 'TAG');
    expect(explanation).toContain('Rais');
    expect(explanation).toContain('tight-aggressive');
  });

  it('should generate explanation for fold recommendation', () => {
    const ev: EVResult = {
      evFold: 0,
      evCall: -5.0,
      evRaise: -3.0,
      bestAction: 'fold',
      bestRaiseSizing: null,
      bestRaiseFraction: null,
    };
    const explanation = generateExplanation(ev, baseBreakdown, 40, 'river', 'unknown');
    expect(explanation).toContain('Fold');
  });

  it('should include opponent context when style is known', () => {
    const ev: EVResult = {
      evFold: 0, evCall: 5, evRaise: 3, bestAction: 'call',
      bestRaiseSizing: null, bestRaiseFraction: null,
    };
    const explanation = generateExplanation(ev, baseBreakdown, 60, 'flop', 'LAG');
    expect(explanation).toContain('loose-aggressive');
  });
});

describe('generateBreakdownNotes', () => {
  it('should warn about low mapping quality', () => {
    const notes = generateBreakdownNotes(
      { evFold: 0, evCall: 5, evRaise: 3, bestAction: 'call', bestRaiseSizing: null, bestRaiseFraction: null },
      0.3,
      'range-lookup'
    );
    expect(notes.some((n) => n.includes('approximated'))).toBe(true);
  });

  it('should warn about fallback equity method', () => {
    const notes = generateBreakdownNotes(
      { evFold: 0, evCall: 5, evRaise: 3, bestAction: 'call', bestRaiseSizing: null, bestRaiseFraction: null },
      0.8,
      'fallback'
    );
    expect(notes.some((n) => n.includes('rough estimate'))).toBe(true);
  });

  it('should warn about close decisions', () => {
    const notes = generateBreakdownNotes(
      { evFold: 0, evCall: 5.0, evRaise: 5.5, bestAction: 'raise', bestRaiseSizing: 10, bestRaiseFraction: 0.5 },
      0.8,
      'range-lookup'
    );
    expect(notes.some((n) => n.includes('close decision'))).toBe(true);
  });
});
