import type { Card, Suit } from '@/lib/domain/types';

/** Suit to unicode symbol mapping */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

/** Suit to color for display */
export const SUIT_COLORS: Record<Suit, string> = {
  h: 'text-red-500',
  d: 'text-blue-500',
  c: 'text-green-700',
  s: 'text-gray-900',
};

export const SUIT_BG_COLORS: Record<Suit, string> = {
  h: 'bg-red-50 border-red-200',
  d: 'bg-blue-50 border-blue-200',
  c: 'bg-green-50 border-green-200',
  s: 'bg-gray-50 border-gray-300',
};

/** Parse a card string like "Ah" into parts */
export function parseCard(card: Card): { rank: string; suit: Suit; symbol: string } {
  return {
    rank: card[0],
    suit: card[1] as Suit,
    symbol: SUIT_SYMBOLS[card[1] as Suit],
  };
}

/** Format card for display: "A♥" */
export function formatCard(card: Card): string {
  const { rank, symbol } = parseCard(card);
  return `${rank}${symbol}`;
}
