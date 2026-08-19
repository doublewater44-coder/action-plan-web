import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { goodPoints, badPoints, nextGoal, score } = await req.json();
  await query(
    `UPDATE weekly_reflections SET good_points=$1, bad_points=$2, next_goal=$3, score=$4
     WHERE id=$5 AND goal_id IN (SELECT id FROM goals WHERE user_id=$6)`,
    [goodPoints, badPoints, nextGoal, score, id, session.userId]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await query(
    'DELETE FROM weekly_reflections WHERE id=$1 AND goal_id IN (SELECT id FROM goals WHERE user_id=$2)',
    [id, session.userId]
  );
  return NextResponse.json({ ok: true });
}
