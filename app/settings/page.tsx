'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [displayUnit, setDisplayUnit] = useState<'chips' | 'bb'>('chips');
  const [defaultStack, setDefaultStack] = useState('100');
  const [darkMode, setDarkMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayUnit,
          defaultStack: parseFloat(defaultStack) || 100,
          darkMode,
          sizingPresets: [
            { label: '25% pot', fraction: 0.25 },
            { label: '33% pot', fraction: 0.33 },
            { label: '50% pot', fraction: 0.5 },
            { label: '66% pot', fraction: 0.66 },
            { label: '75% pot', fraction: 0.75 },
            { label: '100% pot', fraction: 1.0 },
          ],
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      // silent fail
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
        Settings
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Unit Display"
            value={displayUnit}
            onChange={(e) => setDisplayUnit(e.target.value as 'chips' | 'bb')}
          >
            <option value="chips">Chips</option>
            <option value="bb">Big Blinds (BB)</option>
          </Select>

          <Input
            label="Default Stack Size"
            type="number"
            min={1}
            value={defaultStack}
            onChange={(e) => setDefaultStack(e.target.value)}
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="darkMode"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="darkMode" className="text-sm text-slate-700">
              Dark Mode (coming soon)
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sizing Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500 space-y-1">
            <p>Default sizing presets: 25%, 33%, 50%, 66%, 75%, 100% pot</p>
            <p className="text-xs text-slate-400">Custom sizing presets coming in a future update.</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        {saved ? 'Saved!' : 'Save Settings'}
      </Button>
    </div>
  );
}
