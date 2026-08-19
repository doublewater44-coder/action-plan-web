import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actionId = req.nextUrl.searchParams.get('actionId');
  if (!actionId) return NextResponse.json({ error: 'actionId required' }, { status: 400 });

  const rows = await query(
    'SELECT progress_date, count, note FROM daily_progress WHERE action_id=$1 ORDER BY progress_date ASC',
    [actionId]
  );
  return NextResponse.json(rows);
}
