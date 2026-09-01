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
    CREATE TABLE IF NOT EXISTS action_achievements (
      id SERIAL PRIMARY KEY,
      action_id INTEGER NOT NULL,
      action_name TEXT NOT NULL,
      target_count NUMERIC,
      unit TEXT,
      actual_count NUMERIC DEFAULT 0,
      achieved_at DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const rows = await query<{ name: string; target_count: number; unit: string; reset_at: string | null }>(
    `SELECT a.name, a.target_count, a.unit, a.reset_at
     FROM actions a JOIN goals g ON a.goal_id = g.id
     WHERE a.id=$1 AND g.user_id=$2`,
    [id, session.userId]
  );
  if (!rows.length) return NextResponse.json({ error: 'Action not found' }, { status: 404 });

  const a = rows[0];
  const progressRows = await query<{ actual: string }>(
    `SELECT COALESCE(SUM(count), 0) AS actual FROM daily_progress
     WHERE action_id=$1 AND ($2::date IS NULL OR progress_date::date >= $2::date)`,
    [id, a.reset_at || null]
  );
  const actualCount = parseFloat(progressRows[0]?.actual ?? '0');

  await query(
    `INSERT INTO action_achievements (action_id, action_name, target_count, unit, actual_count, achieved_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, a.name, a.target_count, a.unit, actualCount, achievedAt]
  );

  return NextResponse.json({ ok: true });
}
