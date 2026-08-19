import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data: goals } = await supabase
    .from('goals')
    .select('id, name')
    .eq('user_id', session.userId);

  const goalIds = goals?.map(g => g.id) ?? [];
  if (goalIds.length === 0) return NextResponse.json([]);

  const goalNameMap: Record<number, string> = Object.fromEntries(
    (goals ?? []).map(g => [g.id, g.name])
  );

  const { data: actions } = await supabase
    .from('actions')
    .select('id, goal_id, name, target_count, unit, period, deadline')
    .in('goal_id', goalIds)
    .order('goal_id')
    .order('created_at');

  return NextResponse.json(
    (actions ?? []).map(a => ({ ...a, goal_name: goalNameMap[a.goal_id] }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { goalId, name, targetCount, unit, period, deadline } = await req.json();
  const supabase = getSupabase();
  const { data } = await supabase
    .from('actions')
    .insert({ goal_id: goalId, name, target_count: targetCount, unit, period: period ?? '全期間', deadline: deadline ?? null })
    .select('id, goal_id, name, target_count, unit, period, deadline')
    .single();
  return NextResponse.json(data, { status: 201 });
}
