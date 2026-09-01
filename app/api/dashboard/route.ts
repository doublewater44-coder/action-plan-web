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
    // Schema setup & one-time migration
    await query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS achieved_at DATE`);
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
    // Migrate old achieved goals from goals.achieved_at → goal_achievements
    await query(
      `INSERT INTO goal_achievements (goal_id, name, description, deadline, achieved_at)
       SELECT id, name, description, deadline, achieved_at
       FROM goals
       WHERE user_id=$1 AND achieved_at IS NOT NULL
       AND id NOT IN (SELECT DISTINCT goal_id FROM goal_achievements)`,
      [userId]
    );
    // Reset goals to always-active (clear achieved_at)
    await query(
      `UPDATE goals SET achieved_at=NULL WHERE user_id=$1 AND achieved_at IS NOT NULL`,
      [userId]
    );

    const [goals, actions, setting] = await Promise.all([
      query(
        'SELECT id, name, description, deadline FROM goals WHERE user_id=$1 ORDER BY created_at ASC',
        [userId]
      ),
      query(
        `SELECT a.id, a.goal_id, a.name, a.target_count, a.unit, a.period, a.deadline, a.reset_at, g.name AS goal_name
         FROM actions a JOIN goals g ON a.goal_id=g.id
         WHERE g.user_id=$1 ORDER BY a.goal_id, a.created_at ASC`,
        [userId]
      ),
      query<{ value: string }>(
        'SELECT value FROM settings WHERE user_id=$1 AND setting_key=$2',
        [userId, 'qualitative_goal']
      ),
    ]);

    const [totals, weekTotals, chartRows, todayRows, reflections, achievements] = await Promise.all([
      query<{ action_id: number; total: string }>(
        `SELECT dp.action_id, COALESCE(SUM(dp.count),0) AS total
         FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
         WHERE g.user_id=$1 AND (a.reset_at IS NULL OR dp.progress_date::date >= a.reset_at)
         GROUP BY dp.action_id`,
        [userId]
      ),
      query<{ action_id: number; total: string }>(
        `SELECT dp.action_id, COALESCE(SUM(dp.count),0) AS total
         FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
         WHERE g.user_id=$1 AND dp.progress_date>=$2 AND (a.reset_at IS NULL OR dp.progress_date::date >= a.reset_at)
         GROUP BY dp.action_id`,
        [userId, weekStart]
      ),
      query<{ action_id: number; progress_date: string; count: number; note: string }>(
        `SELECT dp.action_id, dp.progress_date, dp.count, dp.note
         FROM daily_progress dp JOIN actions a ON dp.action_id=a.id JOIN goals g ON a.goal_id=g.id
         WHERE g.user_id=$1 AND (a.reset_at IS NULL OR dp.progress_date::date >= a.reset_at)
         ORDER BY dp.action_id, dp.progress_date ASC`,
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
      query<{ id: number; goal_id: number; name: string; description: string; deadline: string; achieved_at: string }>(
        `SELECT ga.id, ga.goal_id, ga.name, ga.description, ga.deadline, ga.achieved_at
         FROM goal_achievements ga JOIN goals g ON ga.goal_id=g.id
         WHERE g.user_id=$1 ORDER BY ga.achieved_at DESC`,
        [userId]
      ),
    ]);

    return NextResponse.json({
      goals,
      achievements,
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
