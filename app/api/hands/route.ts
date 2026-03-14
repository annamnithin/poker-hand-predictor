import { NextRequest, NextResponse } from 'next/server';
import { listHands } from '@/server/repositories/hand-repository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const street = searchParams.get('street') ?? undefined;
    const position = searchParams.get('position') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const hands = await listHands({ street, position, action, limit, offset });

    return NextResponse.json({ hands });
  } catch (err) {
    console.error('List hands error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
