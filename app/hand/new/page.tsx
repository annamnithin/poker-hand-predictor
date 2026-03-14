'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Card as CardType,
  Street,
  Position,
  PlayerStyle,
  ActionHistoryEntry,
  HandScenarioInput,
  RecommendationResult,
} from '@/lib/domain/types';
import { STREETS, POSITIONS, PLAYER_STYLES, BOARD_CARD_COUNT } from '@/lib/domain/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CardPicker } from '@/components/poker/card-picker';
import { ActionHistoryBuilder } from '@/components/poker/action-history-builder';
import { ResultPanel } from '@/components/poker/result-panel';
import { cn } from '@/lib/utils/cn';

export default function NewHandPage() {
  const router = useRouter();

  // Form state
  const [street, setStreet] = useState<Street>('preflop');
  const [heroCards, setHeroCards] = useState<CardType[]>([]);
  const [boardCards, setBoardCards] = useState<CardType[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(6);
  const [heroPosition, setHeroPosition] = useState<Position>('BTN');
  const [potSize, setPotSize] = useState('10');
  const [amountToCall, setAmountToCall] = useState('3');
  const [heroStack, setHeroStack] = useState('100');
  const [villainStack, setVillainStack] = useState('100');
  const [opponentsLeft, setOpponentsLeft] = useState(1);
  const [opponentStyle, setOpponentStyle] = useState<PlayerStyle>('unknown');
  const [opponentRange, setOpponentRange] = useState('');
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([]);

  // Result state
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [inputSnapshot, setInputSnapshot] = useState<HandScenarioInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When street changes, clear board cards if they don't match
  const handleStreetChange = (newStreet: Street) => {
    setStreet(newStreet);
    const maxCards = BOARD_CARD_COUNT[newStreet];
    if (boardCards.length > maxCards) {
      setBoardCards(boardCards.slice(0, maxCards));
    }
  };

  // All cards already picked (for disabling in pickers)
  const allSelectedCards = [...heroCards, ...boardCards];

  const buildInput = (): HandScenarioInput => ({
    street,
    heroCards: heroCards as [CardType, CardType],
    boardCards,
    totalPlayers,
    heroPosition,
    potSize: parseFloat(potSize) || 0,
    amountToCall: parseFloat(amountToCall) || 0,
    heroStack: parseFloat(heroStack) || 0,
    villainStack: parseFloat(villainStack) || 0,
    opponentsLeft,
    opponentStyle,
    opponentRange: opponentRange || undefined,
    actionHistory,
  });

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    // Quick client-side checks
    if (heroCards.length !== 2) {
      setError('Select exactly 2 hero cards.');
      return;
    }
    const expectedBoard = BOARD_CARD_COUNT[street];
    if (boardCards.length !== expectedBoard) {
      setError(`${street} requires exactly ${expectedBoard} board cards.`);
      return;
    }

    setLoading(true);
    try {
      const input = buildInput();
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate recommendation');
        return;
      }

      setResult(data.recommendation);
      setInputSnapshot(input);
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!inputSnapshot) return;
    setSaving(true);
    try {
      const res = await fetch('/api/hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputSnapshot),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/hand/${data.hand.id}`);
      }
    } catch (e) {
      // silently fail save, user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          New Hand
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter the hand details and get a solver-inspired recommendation.
        </p>
      </div>

      {/* Street selector */}
      <Card>
        <CardContent className="pt-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">Street</label>
          <div className="flex gap-2">
            {STREETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStreetChange(s)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                  street === s
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardPicker
            label="Hero Cards (2)"
            maxCards={2}
            selectedCards={heroCards}
            disabledCards={boardCards}
            onChange={setHeroCards}
          />
          {street !== 'preflop' && (
            <CardPicker
              label={`Board Cards (${BOARD_CARD_COUNT[street]})`}
              maxCards={BOARD_CARD_COUNT[street]}
              selectedCards={boardCards}
              disabledCards={heroCards}
              onChange={setBoardCards}
            />
          )}
        </CardContent>
      </Card>

      {/* Table & Position */}
      <Card>
        <CardHeader>
          <CardTitle>Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Select
              label="Hero Position"
              value={heroPosition}
              onChange={(e) => setHeroPosition(e.target.value as Position)}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            <Select
              label="Total Players"
              value={totalPlayers}
              onChange={(e) => setTotalPlayers(parseInt(e.target.value))}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
            <Select
              label="Opponents Left"
              value={opponentsLeft}
              onChange={(e) => setOpponentsLeft(parseInt(e.target.value))}
            >
              {Array.from({ length: totalPlayers - 1 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sizing */}
      <Card>
        <CardHeader>
          <CardTitle>Sizing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pot Size"
              type="number"
              min={0}
              step={0.5}
              value={potSize}
              onChange={(e) => setPotSize(e.target.value)}
            />
            <Input
              label="Amount to Call"
              type="number"
              min={0}
              step={0.5}
              value={amountToCall}
              onChange={(e) => setAmountToCall(e.target.value)}
            />
            <Input
              label="Hero Stack"
              type="number"
              min={0}
              step={1}
              value={heroStack}
              onChange={(e) => setHeroStack(e.target.value)}
            />
            <Input
              label="Villain Stack"
              type="number"
              min={0}
              step={1}
              value={villainStack}
              onChange={(e) => setVillainStack(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Opponent Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Opponent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Player Style"
              value={opponentStyle}
              onChange={(e) => setOpponentStyle(e.target.value as PlayerStyle)}
            >
              {PLAYER_STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Input
              label="Range (optional)"
              placeholder="e.g. top15%"
              value={opponentRange}
              onChange={(e) => setOpponentRange(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action History */}
      <Card>
        <CardHeader>
          <CardTitle>Action History</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionHistoryBuilder
            entries={actionHistory}
            onChange={setActionHistory}
            currentStreet={street}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Analyzing...' : 'Get Recommendation'}
      </Button>

      {/* Result */}
      {result && inputSnapshot && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Result
          </h2>
          <ResultPanel
            result={result}
            input={inputSnapshot}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
