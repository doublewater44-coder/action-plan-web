import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actionId = req.nextUrl.searchParams.get('actionId');
  if (!actionId) return NextResponse.json({ error: 'actionId required' }, { status: 400 });

  const supabase = getSupabase();
  const { data } = await supabase
    .from('daily_progress')
    .select('progress_date, count, note')
    .eq('action_id', actionId)
    .order('progress_date');

  return NextResponse.json(data ?? []);
}
