import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const supabase = getSupabase();
  const { data: goals } = await supabase.from('goals').select('id').eq('user_id', session.userId);
  const goalIds = goals?.map(g => g.id) ?? [];
  if (goalIds.length === 0) return NextResponse.json([]);

  const { data: actions } = await supabase.from('actions').select('id').in('goal_id', goalIds);
  const actionIds = actions?.map(a => a.id) ?? [];
  if (actionIds.length === 0) return NextResponse.json([]);

  const { data } = await supabase
    .from('daily_progress')
    .select('*')
    .in('action_id', actionIds)
    .eq('progress_date', date);

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const records: { actionId: number; date: string; count: number; note: string }[] = await req.json();
  const supabase = getSupabase();

  await supabase.from('daily_progress').upsert(
    records.map(r => ({
      action_id: r.actionId,
      progress_date: r.date,
      count: r.count,
      note: r.note ?? '',
    })),
    { onConflict: 'action_id,progress_date' }
  );

  return NextResponse.json({ ok: true });
}
