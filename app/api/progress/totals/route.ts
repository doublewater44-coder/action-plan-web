import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const dayOfWeek = new Date(today).getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + mondayOffset);
  const weekStart = monday.toISOString().split('T')[0];

  const [totals, weekTotals, todayRows, chartRows] = await Promise.all([
    query<{ action_id: number; total: string }>(
      `SELECT dp.action_id, COALESCE(SUM(dp.count),0) AS total
       FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
       WHERE g.user_id=$1 GROUP BY dp.action_id`,
      [session.userId]
    ),
    query<{ action_id: number; total: string }>(
      `SELECT dp.action_id, COALESCE(SUM(dp.count),0) AS total
       FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
       WHERE g.user_id=$1 AND dp.progress_date >= $2 GROUP BY dp.action_id`,
      [session.userId, weekStart]
    ),
    query<{ action_id: number; count: number; note: string; progress_date: string }>(
      `SELECT dp.action_id, dp.count, dp.note, dp.progress_date
       FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
       WHERE g.user_id=$1 AND dp.progress_date=$2`,
      [session.userId, today]
    ),
    query<{ action_id: number; progress_date: string; count: number; note: string }>(
      `SELECT dp.action_id, dp.progress_date, dp.count, dp.note
       FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
       WHERE g.user_id=$1 ORDER BY dp.action_id, dp.progress_date ASC`,
      [session.userId]
    ),
  ]);

  return NextResponse.json({
    totals: Object.fromEntries(totals.map((r) => [r.action_id, parseFloat(r.total)])),
    weekTotals: Object.fromEntries(weekTotals.map((r) => [r.action_id, parseFloat(r.total)])),
    today: Object.fromEntries(todayRows.map((r) => [r.action_id, r])),
    chart: chartRows,
  });
}
