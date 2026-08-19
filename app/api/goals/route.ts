import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const goals = await query(
    'SELECT id, name, description, deadline FROM goals WHERE user_id = $1 ORDER BY created_at ASC',
    [session.userId]
  );
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, deadline } = await req.json();
  const goal = await queryOne(
    'INSERT INTO goals (user_id, name, description, deadline) VALUES ($1, $2, $3, $4) RETURNING id, name, description, deadline',
    [session.userId, name, description ?? '', deadline ?? null]
  );
  return NextResponse.json(goal, { status: 201 });
}
