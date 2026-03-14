import { describe, it, expect } from 'vitest';
import { calculatePotOdds, minimumEquityToCall, stackToPotRatio } from '@/lib/engine/pot-odds';

describe('calculatePotOdds', () => {
  it('should return 0 when amount to call is 0', () => {
    expect(calculatePotOdds(100, 0)).toBe(0);
  });

  it('should calculate correct pot odds for standard scenario', () => {
    // Pot 100, call 50 → 50/150 = 33.33%
    const odds = calculatePotOdds(100, 50);
    expect(odds).toBeCloseTo(33.33, 1);
  });

  it('should calculate pot odds for small bet into big pot', () => {
    // Pot 200, call 20 → 20/220 = 9.09%
    const odds = calculatePotOdds(200, 20);
    expect(odds).toBeCloseTo(9.09, 1);
  });

  it('should calculate pot odds for all-in scenario', () => {
    // Pot 50, call 100 → 100/150 = 66.67%
    const odds = calculatePotOdds(50, 100);
    expect(odds).toBeCloseTo(66.67, 1);
  });
});

describe('minimumEquityToCall', () => {
  it('should match pot odds', () => {
    expect(minimumEquityToCall(100, 50)).toBeCloseTo(33.33, 1);
  });
});

describe('stackToPotRatio', () => {
  it('should calculate SPR correctly', () => {
    expect(stackToPotRatio(100, 20)).toBe(5);
  });

  it('should return Infinity for zero pot', () => {
    expect(stackToPotRatio(100, 0)).toBe(Infinity);
  });

  it('should detect committed stacks (low SPR)', () => {
    expect(stackToPotRatio(30, 20)).toBe(1.5);
  });
});
