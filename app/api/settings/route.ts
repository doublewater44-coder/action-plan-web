import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = req.nextUrl.searchParams.get('key') ?? 'qualitative_goal';
  const row = await queryOne<{ value: string }>(
    'SELECT value FROM settings WHERE user_id=$1 AND setting_key=$2',
    [session.userId, key]
  );
  return NextResponse.json({ value: row?.value ?? '' });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key, value } = await req.json();
  await query(
    `INSERT INTO settings (user_id, setting_key, value) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, setting_key) DO UPDATE SET value=$3`,
    [session.userId, key, value]
  );
  return NextResponse.json({ ok: true });
}
