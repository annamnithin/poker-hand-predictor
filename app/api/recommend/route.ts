import { NextRequest, NextResponse } from 'next/server';
import { HandScenarioInputSchema } from '@/lib/domain/schemas';
import type { HandScenarioInput } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';
import { validateHandScenario } from '@/lib/validation/validate-scenario';
import { generateRecommendation } from '@/lib/engine/recommend';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Step 1: Zod structural validation
    const parsed = HandScenarioInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Zod widens card fields to string; casting is safe because CardSchema
    // already validates each card value against the full deck literal union.
    const scenario = parsed.data as HandScenarioInput;

    // Step 2: Domain-level validation
    const domainErrors = validateHandScenario(scenario);
    if (domainErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid hand scenario', details: domainErrors },
        { status: 400 }
      );
    }

    // Step 3: Generate recommendation
    const recommendation = generateRecommendation(scenario);

    return NextResponse.json({ recommendation, input: scenario });
  } catch (err) {
    console.error('Recommendation error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
