import { NextRequest, NextResponse } from 'next/server';
import { HandScenarioInputSchema } from '@/lib/domain/schemas';

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

    // Step 2: Domain-level validation
    const domainErrors = validateHandScenario(parsed.data);
    if (domainErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid hand scenario', details: domainErrors },
        { status: 400 }
      );
    }

    // Step 3: Generate recommendation
    const recommendation = generateRecommendation(parsed.data);

    return NextResponse.json({ recommendation, input: parsed.data });
  } catch (err) {
    console.error('Recommendation error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
