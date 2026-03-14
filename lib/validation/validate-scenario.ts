import type { HandScenarioInput, Card, Street } from '@/lib/domain/types';
import { BOARD_CARD_COUNT, FULL_DECK } from '@/lib/domain/types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateHandScenario(input: HandScenarioInput): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...validateCards(input));
  errors.push(...validateBoardForStreet(input.boardCards, input.street));
  errors.push(...validateNumericSanity(input));
  errors.push(...validatePositionPlayerCount(input));
  return errors;
}

export function validateCards(input: HandScenarioInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const allCards = [...input.heroCards, ...input.boardCards];
  const seen = new Set<string>();

  for (const card of allCards) {
    if (seen.has(card)) {
      errors.push({ field: 'cards', message: `Duplicate card detected: ${card}` });
    }
    seen.add(card);
    if (!FULL_DECK.includes(card as Card)) {
      errors.push({ field: 'cards', message: `Invalid card: ${card}` });
    }
  }
  return errors;
}

export function validateBoardForStreet(boardCards: Card[], street: Street): ValidationError[] {
  const expected = BOARD_CARD_COUNT[street];
  if (boardCards.length !== expected) {
    return [{ field: 'boardCards', message: `${street} requires exactly ${expected} board cards, got ${boardCards.length}` }];
  }
  return [];
}

export function validateNumericSanity(input: HandScenarioInput): ValidationError[] {
  const errors: ValidationError[] = [];
  if (input.potSize <= 0) errors.push({ field: 'potSize', message: 'Pot size must be positive' });
  if (input.amountToCall < 0) errors.push({ field: 'amountToCall', message: 'Amount to call cannot be negative' });
  if (input.heroStack <= 0) errors.push({ field: 'heroStack', message: 'Hero stack must be positive' });
  if (input.villainStack <= 0) errors.push({ field: 'villainStack', message: 'Villain stack must be positive' });
  if (input.amountToCall > input.heroStack) errors.push({ field: 'amountToCall', message: 'Amount to call exceeds hero stack' });
  return errors;
}

export function validatePositionPlayerCount(input: HandScenarioInput): ValidationError[] {
  const errors: ValidationError[] = [];
  if (input.opponentsLeft >= input.totalPlayers) {
    errors.push({ field: 'opponentsLeft', message: 'Opponents remaining must be less than total players' });
  }
  if (input.totalPlayers < 2 || input.totalPlayers > 9) {
    errors.push({ field: 'totalPlayers', message: 'Total players must be between 2 and 9' });
  }
  return errors;
}
