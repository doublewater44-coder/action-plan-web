import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actions = await query(
    `SELECT a.id, a.goal_id, a.name, a.target_count, a.unit, a.period, a.deadline, g.name AS goal_name
     FROM actions a JOIN goals g ON a.goal_id = g.id
     WHERE g.user_id = $1 ORDER BY a.goal_id, a.created_at ASC`,
    [session.userId]
  );
  return NextResponse.json(actions);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { goalId, name, targetCount, unit, period, deadline } = await req.json();
  const action = await queryOne(
    `INSERT INTO actions (goal_id, name, target_count, unit, period, deadline)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, goal_id, name, target_count, unit, period, deadline`,
    [goalId, name, targetCount, unit, period ?? '全期間', deadline ?? null]
  );
  return NextResponse.json(action, { status: 201 });
}
