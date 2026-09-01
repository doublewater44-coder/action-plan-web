import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

  await query(`ALTER TABLE actions ADD COLUMN IF NOT EXISTS reset_at DATE`);
  await query(
    `UPDATE actions SET reset_at=$1 WHERE id=$2 AND goal_id IN (SELECT id FROM goals WHERE user_id=$3)`,
    [today, id, session.userId]
  );

  return NextResponse.json({ ok: true });
}
