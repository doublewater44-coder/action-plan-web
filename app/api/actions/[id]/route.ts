import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { name, targetCount, unit, period, deadline } = await req.json();
  const supabase = getSupabase();
  const { data: goals } = await supabase.from('goals').select('id').eq('user_id', session.userId);
  const goalIds = goals?.map(g => g.id) ?? [];
  await supabase
    .from('actions')
    .update({ name, target_count: targetCount, unit, period: period ?? '全期間', deadline: deadline ?? null })
    .eq('id', id)
    .in('goal_id', goalIds);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();
  const { data: goals } = await supabase.from('goals').select('id').eq('user_id', session.userId);
  const goalIds = goals?.map(g => g.id) ?? [];
  await supabase.from('actions').delete().eq('id', id).in('goal_id', goalIds);
  return NextResponse.json({ ok: true });
}
