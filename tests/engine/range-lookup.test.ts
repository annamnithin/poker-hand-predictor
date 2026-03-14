import { describe, it, expect } from 'vitest';
import {
  findStackBucket,
  canonicalizeHand,
  opponentStyleModifier,
  lookupRange,
  inferActionLine,
} from '@/lib/ranges/range-lookup';

describe('findStackBucket', () => {
  it('should find closest bucket for 100bb', () => {
    expect(findStackBucket(100)).toBe(100);
  });

  it('should find closest bucket for 85bb', () => {
    expect(findStackBucket(85)).toBe(100);
  });

  it('should find closest bucket for 30bb', () => {
    expect(findStackBucket(30)).toBe(20);
  });

  it('should find closest bucket for 50bb', () => {
    expect(findStackBucket(50)).toBe(40);
  });

  it('should handle very deep stacks', () => {
    expect(findStackBucket(200)).toBe(150);
  });
});

describe('canonicalizeHand', () => {
  it('should convert suited hand correctly', () => {
    expect(canonicalizeHand(['Ah', 'Kh'])).toBe('AKs');
  });

  it('should convert offsuit hand correctly', () => {
    expect(canonicalizeHand(['Ah', 'Kd'])).toBe('AKo');
  });

  it('should convert pair correctly', () => {
    expect(canonicalizeHand(['Jh', 'Jc'])).toBe('JJ');
  });

  it('should put higher rank first', () => {
    expect(canonicalizeHand(['9d', 'Ts'])).toBe('T9o');
  });

  it('should handle suited connectors', () => {
    expect(canonicalizeHand(['8h', '7h'])).toBe('87s');
  });

  it('should passthrough already canonical strings', () => {
    expect(canonicalizeHand('AKo')).toBe('AKo');
  });
});

describe('opponentStyleModifier', () => {
  it('should return neutral for unknown', () => {
    const mod = opponentStyleModifier('unknown');
    expect(mod.rangeWidthMult).toBe(1.0);
    expect(mod.foldFreqMult).toBe(1.0);
    expect(mod.aggressionMult).toBe(1.0);
  });

  it('should make LAG wider', () => {
    const mod = opponentStyleModifier('LAG');
    expect(mod.rangeWidthMult).toBeGreaterThan(1.0);
  });

  it('should make TAG tighter', () => {
    const mod = opponentStyleModifier('TAG');
    expect(mod.rangeWidthMult).toBeLessThan(1.0);
  });

  it('should give tight-passive highest fold frequency', () => {
    const mod = opponentStyleModifier('tight-passive');
    expect(mod.foldFreqMult).toBeGreaterThan(1.0);
  });
});

describe('lookupRange', () => {
  it('should find BTN open range at 100bb', () => {
    const result = lookupRange('BTN', 'preflop', 'open', 100);
    expect(result).not.toBeNull();
    expect(result!.quality).toBe(1.0);
    expect(result!.range.id).toBe('btn-open-100bb');
  });

  it('should find CO open range', () => {
    const result = lookupRange('CO', 'preflop', 'open', 100);
    expect(result).not.toBeNull();
    expect(result!.range.position).toBe('CO');
  });

  it('should fall back gracefully for unknown position/line', () => {
    const result = lookupRange('HJ', 'preflop', 'open', 100);
    // Should still find something, just lower quality
    expect(result).not.toBeNull();
    expect(result!.quality).toBeLessThan(1.0);
  });
});

describe('inferActionLine', () => {
  it('should return "open" when no prior raises', () => {
    expect(inferActionLine('preflop', [], 'BTN')).toBe('open');
  });

  it('should return "open" when hero is the only raiser', () => {
    const history = [{ action: 'raise', actorPosition: 'BTN' }];
    expect(inferActionLine('preflop', history, 'BTN')).toBe('open');
  });

  it('should return "call-vs-open" when facing a single raise from someone else', () => {
    const history = [{ action: 'raise', actorPosition: 'CO' }];
    expect(inferActionLine('preflop', history, 'BTN')).toBe('call-vs-open');
  });

  it('should return "3bet-vs-open" when two raises and hero made the last one', () => {
    const history = [
      { action: 'raise', actorPosition: 'UTG' },
      { action: '3-bet', actorPosition: 'BTN' },
    ];
    expect(inferActionLine('preflop', history, 'BTN')).toBe('3bet-vs-open');
  });

  it('should return "vs-3bet" when hero opened and villain re-raised', () => {
    const history = [
      { action: 'raise', actorPosition: 'CO' },
      { action: '3-bet', actorPosition: 'BB' },
    ];
    // Hero is CO, opened, and BB 3-bet us
    expect(inferActionLine('preflop', history, 'CO')).toBe('vs-3bet');
  });

  it('should return "4bet" when hero makes the 3rd raise', () => {
    const history = [
      { action: 'raise', actorPosition: 'CO' },
      { action: '3-bet', actorPosition: 'BB' },
      { action: '4-bet', actorPosition: 'CO' },
    ];
    expect(inferActionLine('preflop', history, 'CO')).toBe('4bet');
  });

  it('should return "vs-4bet" when facing the 3rd raise', () => {
    const history = [
      { action: 'raise', actorPosition: 'BTN' },
      { action: '3-bet', actorPosition: 'BB' },
      { action: '4-bet', actorPosition: 'BTN' },
    ];
    // Hero is BB, 3-bet, and BTN 4-bet us
    expect(inferActionLine('preflop', history, 'BB')).toBe('vs-4bet');
  });

  it('should return "vs-3bet" for BB facing SB 3-bet after BB open', () => {
    // Less common: BB opens (in a straddle game), SB 3-bets
    const history = [
      { action: 'raise', actorPosition: 'BB' },
      { action: '3-bet', actorPosition: 'SB' },
    ];
    expect(inferActionLine('preflop', history, 'BB')).toBe('vs-3bet');
  });
});
