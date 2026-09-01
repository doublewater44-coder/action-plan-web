import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const achievedAt: string = body.achievedAt;

  await query(`ALTER TABLE actions ADD COLUMN IF NOT EXISTS reset_at DATE`);
  await query(`
    CREATE TABLE IF NOT EXISTS goal_achievements (
      id SERIAL PRIMARY KEY,
      goal_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      achieved_at DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE goal_achievements ALTER COLUMN deadline TYPE TEXT USING deadline::text`);
  await query(`
    CREATE TABLE IF NOT EXISTS goal_achievement_actions (
      id SERIAL PRIMARY KEY,
      goal_achievement_id INTEGER NOT NULL,
      action_name TEXT NOT NULL,
      target_count NUMERIC,
      unit TEXT,
      actual_count NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const rows = await query<{ name: string; description: string; deadline: string }>(
    'SELECT name, description, deadline FROM goals WHERE id=$1 AND user_id=$2',
    [id, session.userId]
  );
  if (!rows.length) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

  const g = rows[0];
  const achievementResult = await query<{ id: number }>(
    'INSERT INTO goal_achievements (goal_id, name, description, deadline, achieved_at) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [id, g.name, g.description || null, g.deadline || null, achievedAt]
  );
  const goalAchievementId = achievementResult[0].id;

  // アクションの実績をスナップショット保存
  const actionRows = await query<{ id: number; name: string; target_count: number; unit: string; reset_at: string | null }>(
    'SELECT id, name, target_count, unit, reset_at FROM actions WHERE goal_id=$1',
    [id]
  );
  for (const action of actionRows) {
    const progressResult = await query<{ actual: string }>(
      `SELECT COALESCE(SUM(count), 0) AS actual FROM daily_progress
       WHERE action_id=$1 AND ($2::date IS NULL OR progress_date::date >= $2::date)`,
      [action.id, action.reset_at || null]
    );
    const actual = parseFloat(progressResult[0]?.actual ?? '0');
    await query(
      `INSERT INTO goal_achievement_actions (goal_achievement_id, action_name, target_count, unit, actual_count)
       VALUES ($1,$2,$3,$4,$5)`,
      [goalAchievementId, action.name, action.target_count, action.unit, actual]
    );
  }

  return NextResponse.json({ ok: true });
}
