import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const achievedAt: string = body.achievedAt;

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

  const rows = await query<{ name: string; description: string; deadline: string }>(
    'SELECT name, description, deadline FROM goals WHERE id=$1 AND user_id=$2',
    [id, session.userId]
  );
  if (!rows.length) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

  const g = rows[0];
  await query(
    'INSERT INTO goal_achievements (goal_id, name, description, deadline, achieved_at) VALUES ($1,$2,$3,$4,$5)',
    [id, g.name, g.description || null, g.deadline || null, achievedAt]
  );

  return NextResponse.json({ ok: true });
}
