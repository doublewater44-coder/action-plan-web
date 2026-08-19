import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const goalId = req.nextUrl.searchParams.get('goalId');
  if (!goalId) return NextResponse.json({ error: 'goalId required' }, { status: 400 });

  const supabase = getSupabase();
  const { data } = await supabase
    .from('weekly_reflections')
    .select('*')
    .eq('goal_id', goalId)
    .order('week_start', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { goalId, weekStart, goodPoints, badPoints, nextGoal, score } = await req.json();
  const supabase = getSupabase();
  await supabase.from('weekly_reflections').upsert(
    { goal_id: goalId, week_start: weekStart, good_points: goodPoints, bad_points: badPoints, next_goal: nextGoal, score },
    { onConflict: 'goal_id,week_start' }
  );
  return NextResponse.json({ ok: true });
}
