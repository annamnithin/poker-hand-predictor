import { NextRequest, NextResponse } from 'next/server';
import { HandScenarioInputSchema } from '@/lib/domain/schemas';
import { validateHandScenario } from '@/lib/validation/validate-scenario';
import { generateRecommendation } from '@/lib/engine/recommend';
import { saveHandWithRecommendation } from '@/server/repositories/hand-repository';
import type { HandScenarioInput } from '@/lib/domain/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = HandScenarioInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Zod's transform inside superRefine widens card fields back to string;
    // casting is safe because CardSchema already validates each card value.
    const scenario = parsed.data as HandScenarioInput;

    const domainErrors = validateHandScenario(scenario);
    if (domainErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid hand scenario', details: domainErrors },
        { status: 400 }
      );
    }

    // Generate recommendation and save together
    const recommendation = generateRecommendation(scenario);
    const saved = await saveHandWithRecommendation(scenario, recommendation);

    return NextResponse.json({ hand: saved }, { status: 201 });
  } catch (err) {
    console.error('Save hand error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
