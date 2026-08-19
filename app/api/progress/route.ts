import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query, transaction } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const rows = await query(
    `SELECT dp.* FROM daily_progress dp
     JOIN actions a ON dp.action_id = a.id
     JOIN goals g ON a.goal_id = g.id
     WHERE g.user_id = $1 AND dp.progress_date = $2`,
    [session.userId, date]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const records: { actionId: number; date: string; count: number; note: string }[] = await req.json();

  await transaction(async (client) => {
    for (const r of records) {
      await client.query(
        `INSERT INTO daily_progress (action_id, progress_date, count, note)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (action_id, progress_date) DO UPDATE SET count=$3, note=$4`,
        [r.actionId, r.date, r.count, r.note ?? '']
      );
    }
  });

  return NextResponse.json({ ok: true });
}

export async function GET_by_action(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actionId = req.nextUrl.searchParams.get('actionId');
  const rows = await query(
    'SELECT * FROM daily_progress WHERE action_id=$1 ORDER BY progress_date ASC',
    [actionId]
  );
  return NextResponse.json(rows);
}
