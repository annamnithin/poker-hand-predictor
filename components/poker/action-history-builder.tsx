'use client';

import { useState } from 'react';
import type { ActionHistoryEntry, ActionType, Position, Street } from '@/lib/domain/types';
import { ACTION_TYPES, POSITIONS, STREETS } from '@/lib/domain/types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

interface ActionHistoryBuilderProps {
  entries: ActionHistoryEntry[];
  onChange: (entries: ActionHistoryEntry[]) => void;
  currentStreet: Street;
}

export function ActionHistoryBuilder({
  entries,
  onChange,
  currentStreet,
}: ActionHistoryBuilderProps) {
  const [newAction, setNewAction] = useState<ActionType>('bet');
  const [newPosition, setNewPosition] = useState<Position>('UTG');
  const [newSize, setNewSize] = useState('0');
  const [newStreet, setNewStreet] = useState<Street>(currentStreet);

  const addEntry = () => {
    const entry: ActionHistoryEntry = {
      street: newStreet,
      actorPosition: newPosition,
      action: newAction,
      size: parseFloat(newSize) || 0,
      orderIndex: entries.length,
    };
    onChange([...entries, entry]);
    setNewSize('0');
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const needsSize = ['bet', 'raise', '3-bet', '4-bet', 'c-bet', 'call', 'all-in', 'limp', 'check-raise'].includes(newAction);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">Action History</label>

      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
            >
              <span className="text-slate-500 text-xs font-mono w-6">#{i + 1}</span>
              <span className="font-medium text-emerald-700 capitalize">{entry.street}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-700">{entry.actorPosition}</span>
              <span className={cn(
                'font-medium capitalize',
                entry.action === 'fold' ? 'text-red-500' :
                entry.action === 'raise' || entry.action === '3-bet' ? 'text-amber-600' :
                'text-slate-700'
              )}>
                {entry.action}
              </span>
              {entry.size > 0 && (
                <span className="text-slate-500">{entry.size}</span>
              )}
              <button
                type="button"
                onClick={() => removeEntry(i)}
                className="ml-auto text-slate-400 hover:text-red-500 text-xs"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new entry row */}
      <div className="flex gap-2 items-end flex-wrap">
        <div className="w-24">
          <Select
            label="Street"
            value={newStreet}
            onChange={(e) => setNewStreet(e.target.value as Street)}
          >
            {STREETS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div className="w-24">
          <Select
            label="Position"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value as Position)}
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
        <div className="w-28">
          <Select
            label="Action"
            value={newAction}
            onChange={(e) => setNewAction(e.target.value as ActionType)}
          >
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
        {needsSize && (
          <div className="w-20">
            <Input
              label="Size"
              type="number"
              min={0}
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
            />
          </div>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={addEntry}>
          Add
        </Button>
      </div>
    </div>
  );
}
