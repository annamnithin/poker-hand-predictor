import { NextRequest, NextResponse } from 'next/server';
import { HandScenarioInputSchema } from '@/lib/domain/schemas';
import { validateHandScenario } from '@/lib/validation/validate-scenario';
import { generateRecommendation } from '@/lib/engine/recommend';
import { saveHandWithRecommendation } from '@/server/repositories/hand-repository';

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

    const domainErrors = validateHandScenario(parsed.data);
    if (domainErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid hand scenario', details: domainErrors },
        { status: 400 }
      );
    }

    // Generate recommendation and save together
    const recommendation = generateRecommendation(parsed.data);
    const saved = await saveHandWithRecommendation(parsed.data, recommendation);

    return NextResponse.json({ hand: saved }, { status: 201 });
  } catch (err) {
    console.error('Save hand error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
