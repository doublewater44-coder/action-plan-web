import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

  await query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS achieved_at DATE`);
  await query(
    'UPDATE goals SET achieved_at = $1 WHERE id = $2 AND user_id = $3',
    [today, id, session.userId]
  );

  return NextResponse.json({ ok: true });
}
