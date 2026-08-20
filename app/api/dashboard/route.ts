import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.userId;

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const dayOfWeek = new Date(today).getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + mondayOffset);
  const weekStart = monday.toISOString().split('T')[0];

  try {
  // グループ1: 基本データ（3接続）
  const [goals, actions, setting] = await Promise.all([
    query(
      'SELECT id, name, description, deadline FROM goals WHERE user_id=$1 ORDER BY created_at ASC',
      [userId]
    ),
    query(
      `SELECT a.id, a.goal_id, a.name, a.target_count, a.unit, a.period, a.deadline, g.name AS goal_name
       FROM actions a JOIN goals g ON a.goal_id=g.id
       WHERE g.user_id=$1 ORDER BY a.goal_id, a.created_at ASC`,
      [userId]
    ),
    query<{ value: string }>(
      'SELECT value FROM settings WHERE user_id=$1 AND setting_key=$2',
      [userId, 'qualitative_goal']
    ),
  ]);

  // グループ2: 進捗・振り返りデータ（3接続）
  const [totals, weekTotals, chartRows, todayRows, reflections] = await Promise.all([
    query<{ action_id: number; total: string }>(
      `SELECT dp.action_id, COALESCE(SUM(dp.count),0) AS total
       FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
       WHERE g.user_id=$1 GROUP BY dp.action_id`,
      [userId]
    ),
    query<{ action_id: number; total: string }>(
      `SELECT dp.action_id, COALESCE(SUM(dp.count),0) AS total
       FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
       WHERE g.user_id=$1 AND dp.progress_date>=$2 GROUP BY dp.action_id`,
      [userId, weekStart]
    ),
    query<{ action_id: number; progress_date: string; count: number; note: string }>(
      `SELECT dp.action_id, dp.progress_date, dp.count, dp.note
       FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
       WHERE g.user_id=$1 ORDER BY dp.action_id, dp.progress_date ASC`,
      [userId]
    ),
    query<{ action_id: number; count: number; note: string; progress_date: string }>(
      `SELECT dp.action_id, dp.count, dp.note, dp.progress_date
       FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
       WHERE g.user_id=$1 AND dp.progress_date=$2`,
      [userId, today]
    ),
    query(
      `SELECT wr.* FROM weekly_reflections wr
       JOIN goals g ON wr.goal_id=g.id
       WHERE g.user_id=$1 ORDER BY wr.week_start DESC`,
      [userId]
    ),
  ]);

  return NextResponse.json({
    goals,
    actions,
    totals: Object.fromEntries(totals.map(r => [r.action_id, parseFloat(r.total)])),
    weekTotals: Object.fromEntries(weekTotals.map(r => [r.action_id, parseFloat(r.total)])),
    today: Object.fromEntries(todayRows.map(r => [r.action_id, r])),
    chart: chartRows,
    qualitative: setting[0]?.value ?? '',
    reflections,
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
