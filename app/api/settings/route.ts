import { NextRequest, NextResponse } from 'next/server';
import { getUserSettings, updateUserSettings } from '@/server/repositories/hand-repository';
import { UserSettingsSchema } from '@/lib/domain/schemas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getUserSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('Get settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UserSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateUserSettings(parsed.data);
    return NextResponse.json({ settings: updated.settings });
  } catch (err) {
    console.error('Update settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
