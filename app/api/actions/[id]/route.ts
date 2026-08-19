import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { name, targetCount, unit, period, deadline } = await req.json();
  await query(
    `UPDATE actions SET name=$1, target_count=$2, unit=$3, period=$4, deadline=$5
     WHERE id=$6 AND goal_id IN (SELECT id FROM goals WHERE user_id=$7)`,
    [name, targetCount, unit, period ?? '全期間', deadline ?? null, id, session.userId]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await query(
    'DELETE FROM actions WHERE id=$1 AND goal_id IN (SELECT id FROM goals WHERE user_id=$2)',
    [id, session.userId]
  );
  return NextResponse.json({ ok: true });
}
