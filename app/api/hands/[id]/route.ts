import { NextRequest, NextResponse } from 'next/server';
import { getHand, deleteHand } from '@/server/repositories/hand-repository';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hand = await getHand(params.id);
    if (!hand) {
      return NextResponse.json({ error: 'Hand not found' }, { status: 404 });
    }
    return NextResponse.json({ hand });
  } catch (err) {
    console.error('Get hand error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteHand(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete hand error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
