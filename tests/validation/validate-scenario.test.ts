import { describe, it, expect } from 'vitest';
import {
  validateCards,
  validateBoardForStreet,
  validateNumericSanity,
  validatePositionPlayerCount,
  validateHandScenario,
} from '@/lib/validation/validate-scenario';
import type { HandScenarioInput } from '@/lib/domain/types';

const baseInput: HandScenarioInput = {
  street: 'flop',
  heroCards: ['Ah', 'Kd'],
  boardCards: ['Ts', '9c', '2h'],
  totalPlayers: 6,
  heroPosition: 'BTN',
  potSize: 10,
  amountToCall: 5,
  heroStack: 100,
  villainStack: 100,
  opponentsLeft: 1,
  opponents: [{ style: 'unknown' }],
  actionHistory: [],
};

describe('validateCards', () => {
  it('should pass with no duplicates', () => {
    const errors = validateCards(baseInput);
    expect(errors).toHaveLength(0);
  });

  it('should detect duplicate cards in hero hand', () => {
    const input = { ...baseInput, heroCards: ['Ah', 'Ah'] as any };
    const errors = validateCards(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Duplicate');
  });

  it('should detect overlap between hero and board', () => {
    const input = {
      ...baseInput,
      heroCards: ['Ah', 'Ts'] as any, // Ts is also on the board
    };
    const errors = validateCards(input);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validateBoardForStreet', () => {
  it('should require 0 board cards for preflop', () => {
    const errors = validateBoardForStreet([], 'preflop');
    expect(errors).toHaveLength(0);
  });

  it('should require 3 board cards for flop', () => {
    const errors = validateBoardForStreet(['Ts', '9c', '2h'], 'flop');
    expect(errors).toHaveLength(0);
  });

  it('should reject wrong count for flop', () => {
    const errors = validateBoardForStreet(['Ts', '9c'], 'flop');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('exactly 3');
  });

  it('should require 4 board cards for turn', () => {
    const errors = validateBoardForStreet(['Ts', '9c', '2h', '5d'], 'turn');
    expect(errors).toHaveLength(0);
  });

  it('should require 5 board cards for river', () => {
    const errors = validateBoardForStreet(['Ts', '9c', '2h', '5d', 'Kc'], 'river');
    expect(errors).toHaveLength(0);
  });
});

describe('validateNumericSanity', () => {
  it('should pass with valid numbers', () => {
    const errors = validateNumericSanity(baseInput);
    expect(errors).toHaveLength(0);
  });

  it('should reject negative pot', () => {
    const errors = validateNumericSanity({ ...baseInput, potSize: -5 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject amount to call > hero stack', () => {
    const errors = validateNumericSanity({ ...baseInput, amountToCall: 200, heroStack: 100 });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validatePositionPlayerCount', () => {
  it('should pass with valid setup', () => {
    const errors = validatePositionPlayerCount(baseInput);
    expect(errors).toHaveLength(0);
  });

  it('should reject opponents >= total players', () => {
    const errors = validatePositionPlayerCount({ ...baseInput, opponentsLeft: 6, totalPlayers: 6 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject player count out of range', () => {
    const errors = validatePositionPlayerCount({ ...baseInput, totalPlayers: 10 });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validateHandScenario (full)', () => {
  it('should pass for a valid scenario', () => {
    const errors = validateHandScenario(baseInput);
    expect(errors).toHaveLength(0);
  });

  it('should catch multiple issues', () => {
    const input: HandScenarioInput = {
      ...baseInput,
      heroCards: ['Ah', 'Ts'], // Ts overlaps with board
      potSize: -5,
    };
    const errors = validateHandScenario(input);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
