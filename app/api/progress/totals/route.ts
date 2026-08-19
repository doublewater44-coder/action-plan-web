import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const dayOfWeek = new Date(today).getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + mondayOffset);
  const weekStart = monday.toISOString().split('T')[0];

  const supabase = getSupabase();

  const { data: goals } = await supabase.from('goals').select('id').eq('user_id', session.userId);
  const goalIds = goals?.map(g => g.id) ?? [];
  if (goalIds.length === 0) {
    return NextResponse.json({ totals: {}, weekTotals: {}, today: {}, chart: [] });
  }

  const { data: actions } = await supabase.from('actions').select('id').in('goal_id', goalIds);
  const actionIds = actions?.map(a => a.id) ?? [];
  if (actionIds.length === 0) {
    return NextResponse.json({ totals: {}, weekTotals: {}, today: {}, chart: [] });
  }

  const { data: progress } = await supabase
    .from('daily_progress')
    .select('action_id, progress_date, count, note')
    .in('action_id', actionIds)
    .order('action_id')
    .order('progress_date');

  const totals: Record<number, number> = {};
  const weekTotals: Record<number, number> = {};
  const todayMap: Record<number, { action_id: number; count: number; note: string; progress_date: string }> = {};

  for (const row of progress ?? []) {
    const c = Number(row.count);
    totals[row.action_id] = (totals[row.action_id] ?? 0) + c;
    if (row.progress_date >= weekStart) {
      weekTotals[row.action_id] = (weekTotals[row.action_id] ?? 0) + c;
    }
    if (row.progress_date === today) {
      todayMap[row.action_id] = row;
    }
  }

  return NextResponse.json({ totals, weekTotals, today: todayMap, chart: progress ?? [] });
}
