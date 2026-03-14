'use client';

import { useState } from 'react';
import type { Card, Rank, Suit } from '@/lib/domain/types';
import { RANKS, SUITS } from '@/lib/domain/types';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/utils/card-display';
import { cn } from '@/lib/utils/cn';

interface CardPickerProps {
  label: string;
  maxCards: number;
  selectedCards: Card[];
  disabledCards: Card[]; // cards already selected elsewhere
  onChange: (cards: Card[]) => void;
}

export function CardPicker({ label, maxCards, selectedCards, disabledCards, onChange }: CardPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCard = (card: Card) => {
    if (selectedCards.includes(card)) {
      onChange(selectedCards.filter((c) => c !== card));
    } else if (selectedCards.length < maxCards) {
      onChange([...selectedCards, card]);
    }
  };

  const isDisabled = (card: Card) =>
    disabledCards.includes(card) && !selectedCards.includes(card);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>

      {/* Selected cards display */}
      <div className="flex gap-2 min-h-[44px] items-center">
        {selectedCards.length === 0 && (
          <span className="text-sm text-slate-400 italic">No cards selected</span>
        )}
        {selectedCards.map((card) => (
          <MiniCard key={card} card={card} onClick={() => toggleCard(card)} />
        ))}
        {selectedCards.length < maxCards && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'w-10 h-14 rounded-lg border-2 border-dashed border-slate-300',
              'flex items-center justify-center text-slate-400 hover:border-emerald-400',
              'hover:text-emerald-500 transition-colors text-lg'
            )}
          >
            +
          </button>
        )}
      </div>

      {/* Card grid picker */}
      {isOpen && (
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 shadow-inner">
          {SUITS.map((suit) => (
            <div key={suit} className="flex gap-1 mb-1 last:mb-0">
              <span className={cn('w-6 text-center text-lg', SUIT_COLORS[suit])}>
                {SUIT_SYMBOLS[suit]}
              </span>
              <div className="flex gap-1 flex-wrap">
                {RANKS.map((rank) => {
                  const card = `${rank}${suit}` as Card;
                  const selected = selectedCards.includes(card);
                  const disabled = isDisabled(card);
                  return (
                    <button
                      key={card}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleCard(card)}
                      className={cn(
                        'w-8 h-8 rounded text-xs font-bold transition-all duration-100',
                        selected
                          ? 'bg-emerald-600 text-white shadow-sm scale-105'
                          : disabled
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-white border border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                      )}
                    >
                      {rank}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-700"
          >
            Close picker
          </button>
        </div>
      )}
    </div>
  );
}

function MiniCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const rank = card[0];
  const suit = card[1] as Suit;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-10 h-14 rounded-lg border-2 flex flex-col items-center justify-center',
        'font-bold text-sm transition-all hover:scale-105 shadow-sm bg-white',
        SUIT_COLORS[suit],
        suit === 'h' ? 'border-red-300' : suit === 'd' ? 'border-blue-300' : suit === 'c' ? 'border-green-300' : 'border-gray-400'
      )}
    >
      <span>{rank}</span>
      <span className="text-xs">{SUIT_SYMBOLS[suit]}</span>
    </button>
  );
}
