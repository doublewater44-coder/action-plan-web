import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const goalId = req.nextUrl.searchParams.get('goalId');
  if (!goalId) return NextResponse.json({ error: 'goalId required' }, { status: 400 });

  const rows = await query(
    'SELECT * FROM weekly_reflections WHERE goal_id=$1 ORDER BY week_start DESC',
    [goalId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { goalId, weekStart, goodPoints, badPoints, nextGoal, score } = await req.json();
  await query(
    `INSERT INTO weekly_reflections (goal_id, week_start, good_points, bad_points, next_goal, score)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (goal_id, week_start) DO UPDATE SET good_points=$3, bad_points=$4, next_goal=$5, score=$6`,
    [goalId, weekStart, goodPoints, badPoints, nextGoal, score]
  );
  return NextResponse.json({ ok: true });
}
