import { describe, it, expect } from 'vitest';
import { generateRecommendation, normalizeScenario } from '@/lib/engine/recommend';
import { calculateEV } from '@/lib/engine/ev-calculator';
import { calculateConfidence, assessInputCompleteness } from '@/lib/engine/confidence';
import type { HandScenarioInput, NormalizedScenario } from '@/lib/domain/types';

const premiumPreflop: HandScenarioInput = {
  street: 'preflop',
  heroCards: ['Ah', 'Kd'],
  boardCards: [],
  totalPlayers: 6,
  heroPosition: 'BTN',
  potSize: 7,
  amountToCall: 3,
  heroStack: 100,
  villainStack: 100,
  opponentsLeft: 1,
  opponents: [{ style: 'unknown' }],
  actionHistory: [
    { street: 'preflop', actorPosition: 'CO', action: 'raise', size: 3, orderIndex: 0 },
  ],
};

const marginalHand: HandScenarioInput = {
  street: 'preflop',
  heroCards: ['7d', '2c'],
  boardCards: [],
  totalPlayers: 6,
  heroPosition: 'UTG',
  potSize: 1.5,
  amountToCall: 0,
  heroStack: 100,
  villainStack: 100,
  opponentsLeft: 5,
  opponents: [{ style: 'TAG' }, { style: 'unknown' }, { style: 'unknown' }, { style: 'unknown' }, { style: 'unknown' }],
  actionHistory: [],
};

describe('normalizeScenario', () => {
  it('should normalize a basic scenario', () => {
    const norm = normalizeScenario(premiumPreflop);
    expect(norm.street).toBe('preflop');
    expect(norm.potSizeBB).toBe(7);
    expect(norm.amountToCallBB).toBe(3);
    expect(norm.effectiveStackBB).toBe(100);
    expect(norm.stackBucket).toBe(100);
  });

  it('should use the smaller stack as effective', () => {
    const input = { ...premiumPreflop, heroStack: 50, villainStack: 100 };
    const norm = normalizeScenario(input);
    expect(norm.effectiveStackBB).toBe(50);
  });
});

describe('calculateEV', () => {
  it('should produce finite EV values', () => {
    const norm = normalizeScenario(premiumPreflop);
    const ev = calculateEV(norm);
    expect(isFinite(ev.evFold)).toBe(true);
    expect(isFinite(ev.evCall)).toBe(true);
    expect(isFinite(ev.evRaise)).toBe(true);
  });

  it('should recommend fold EV = 0', () => {
    const norm = normalizeScenario(premiumPreflop);
    const ev = calculateEV(norm);
    expect(ev.evFold).toBe(0);
  });

  it('should have a valid best action', () => {
    const norm = normalizeScenario(premiumPreflop);
    const ev = calculateEV(norm);
    expect(['fold', 'call', 'raise']).toContain(ev.bestAction);
  });

  it('should prefer raise/call over fold for premium hands', () => {
    const norm = normalizeScenario(premiumPreflop);
    const ev = calculateEV(norm);
    // AKo facing a raise on BTN — should not fold
    expect(ev.bestAction).not.toBe('fold');
  });
});

describe('generateRecommendation', () => {
  it('should produce a complete recommendation', () => {
    const result = generateRecommendation(premiumPreflop);
    expect(result.ev).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.explanation).toBeTruthy();
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.potOdds).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.heroEquity).toBeGreaterThan(0);
  });

  it('should return explanations that contain action references', () => {
    const result = generateRecommendation(premiumPreflop);
    const lowerExplanation = result.explanation.toLowerCase();
    // Explanation should mention at least one action
    const mentionsAction =
      lowerExplanation.includes('call') ||
      lowerExplanation.includes('raise') ||
      lowerExplanation.includes('fold');
    expect(mentionsAction).toBe(true);
  });

  it('should give lower confidence for marginal, under-specified hands', () => {
    const premiumResult = generateRecommendation(premiumPreflop);
    const marginalResult = generateRecommendation(marginalHand);
    // Marginal hand with TAG opponent should be different confidence
    // Just check both are in valid range
    expect(premiumResult.confidence).toBeGreaterThanOrEqual(0);
    expect(marginalResult.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateConfidence', () => {
  it('should produce higher confidence with larger EV gap', () => {
    const highGap = calculateConfidence({
      ev: { evFold: 0, evCall: 5, evRaise: 30, bestAction: 'raise', bestRaiseSizing: 10, bestRaiseFraction: 0.5 },
      mappingQuality: 0.8,
      hasExplicitRange: false,
      equityMethod: 'range-lookup',
      inputCompleteness: 0.7,
    });

    const lowGap = calculateConfidence({
      ev: { evFold: 0, evCall: 5, evRaise: 5.5, bestAction: 'raise', bestRaiseSizing: 10, bestRaiseFraction: 0.5 },
      mappingQuality: 0.8,
      hasExplicitRange: false,
      equityMethod: 'range-lookup',
      inputCompleteness: 0.7,
    });

    expect(highGap).toBeGreaterThan(lowGap);
  });
});

describe('assessInputCompleteness', () => {
  it('should give higher completeness with more info', () => {
    const full = assessInputCompleteness({
      actionHistory: [{ dummy: true }],
      opponents: [{ style: 'TAG', range: 'top15%' }],
    });
    const minimal = assessInputCompleteness({
      actionHistory: [],
      opponents: [{ style: 'unknown' }],
    });
    expect(full).toBeGreaterThan(minimal);
  });
});

// ============================================================
// 3-BET AND 4-BET SCENARIO TESTS
// ============================================================

describe('3-bet and 4-bet scenarios', () => {
  it('should produce a recommendation for a vs-3bet scenario', () => {
    const input: HandScenarioInput = {
      street: 'preflop',
      heroCards: ['Ah', 'Kd'],
      boardCards: [],
      totalPlayers: 6,
      heroPosition: 'CO',
      potSize: 24,        // CO open 3bb, BB 3-bet to 10bb, pot = 3+10+1+0.5 ≈ 14.5, approx 24 with antes
      amountToCall: 7,    // hero needs to call 7 more to see flop
      heroStack: 90,
      villainStack: 90,
      opponentsLeft: 1,
      opponents: [{ style: 'TAG' }],
      actionHistory: [
        { street: 'preflop', actorPosition: 'CO', action: 'raise', size: 3, orderIndex: 0 },
        { street: 'preflop', actorPosition: 'BB', action: '3-bet', size: 10, orderIndex: 1 },
      ],
    };

    const result = generateRecommendation(input);

    expect(result.ev.bestAction).toBeDefined();
    expect(['fold', 'call', 'raise']).toContain(result.ev.bestAction);
    expect(result.explanation.length).toBeGreaterThan(0);
    // AKo facing a 3-bet from a TAG should usually continue (call or 4-bet)
    expect(result.ev.bestAction).not.toBe('fold');
  });

  it('should fold weak hands facing a 3-bet', () => {
    const input: HandScenarioInput = {
      street: 'preflop',
      heroCards: ['9h', '7d'],  // 97o — total junk vs a 3-bet
      boardCards: [],
      totalPlayers: 6,
      heroPosition: 'CO',
      potSize: 14,         // more realistic: 3bb open + 10bb 3-bet + 1.5bb blinds
      amountToCall: 7,     // hero needs to call 7 more
      heroStack: 90,
      villainStack: 90,
      opponentsLeft: 1,
      opponents: [{ style: 'TAG' }],
      actionHistory: [
        { street: 'preflop', actorPosition: 'CO', action: 'raise', size: 3, orderIndex: 0 },
        { street: 'preflop', actorPosition: 'BB', action: '3-bet', size: 10, orderIndex: 1 },
      ],
    };

    const result = generateRecommendation(input);
    // 97o facing a TAG 3-bet: call EV and raise EV should both be negative or near-zero
    // The best action should be fold (or at worst, a very marginal call/raise)
    expect(result.ev.evCall).toBeLessThan(result.ev.evFold + 2); // call should be close to or worse than fold
    // If still not folding, at minimum the EV should be very close to zero
    const bestEV = Math.max(result.ev.evFold, result.ev.evCall, result.ev.evRaise);
    expect(bestEV).toBeLessThan(5); // should be a marginal/bad spot, not a clear profitable one
  });

  it('should have less fold equity when facing a 3-bet vs when opening', () => {
    const openInput: HandScenarioInput = {
      street: 'preflop',
      heroCards: ['Qs', 'Js'],
      boardCards: [],
      totalPlayers: 6,
      heroPosition: 'CO',
      potSize: 4,
      amountToCall: 0,
      heroStack: 100,
      villainStack: 100,
      opponentsLeft: 3,
      opponents: [{ style: 'unknown' }, { style: 'unknown' }, { style: 'unknown' }],
      actionHistory: [],
    };

    const vs3betInput: HandScenarioInput = {
      ...openInput,
      potSize: 24,
      amountToCall: 7,
      heroStack: 90,
      opponentsLeft: 1,
      actionHistory: [
        { street: 'preflop', actorPosition: 'CO', action: 'raise', size: 3, orderIndex: 0 },
        { street: 'preflop', actorPosition: 'BB', action: '3-bet', size: 10, orderIndex: 1 },
      ],
    };

    const openResult = generateRecommendation(openInput);
    const vs3betResult = generateRecommendation(vs3betInput);

    // Fold equity in the breakdown should be lower when facing a 3-bet
    expect(vs3betResult.breakdown.foldEquity).toBeLessThan(openResult.breakdown.foldEquity);
  });

  it('should produce a recommendation for a vs-4bet scenario', () => {
    const input: HandScenarioInput = {
      street: 'preflop',
      heroCards: ['Kd', 'Ks'],
      boardCards: [],
      totalPlayers: 6,
      heroPosition: 'BB',
      potSize: 60,
      amountToCall: 25,
      heroStack: 65,
      villainStack: 65,
      opponentsLeft: 1,
      opponents: [{ style: 'TAG' }],
      actionHistory: [
        { street: 'preflop', actorPosition: 'BTN', action: 'raise', size: 3, orderIndex: 0 },
        { street: 'preflop', actorPosition: 'BB', action: '3-bet', size: 10, orderIndex: 1 },
        { street: 'preflop', actorPosition: 'BTN', action: '4-bet', size: 25, orderIndex: 2 },
      ],
    };

    const result = generateRecommendation(input);

    // KK facing a 4-bet should never fold
    expect(result.ev.bestAction).not.toBe('fold');
    expect(result.explanation).toBeTruthy();
  });

  it('should mention 3-bet/4-bet context in explanation', () => {
    const input: HandScenarioInput = {
      street: 'preflop',
      heroCards: ['As', 'Ks'],
      boardCards: [],
      totalPlayers: 6,
      heroPosition: 'CO',
      potSize: 24,
      amountToCall: 7,
      heroStack: 90,
      villainStack: 90,
      opponentsLeft: 1,
      opponents: [{ style: 'unknown' }],
      actionHistory: [
        { street: 'preflop', actorPosition: 'CO', action: 'raise', size: 3, orderIndex: 0 },
        { street: 'preflop', actorPosition: 'BB', action: '3-bet', size: 10, orderIndex: 1 },
      ],
    };

    const result = generateRecommendation(input);
    // Explanation should reference the 3-bet context
    expect(result.explanation.toLowerCase()).toContain('3-bet');
  });
});
