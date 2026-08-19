import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = req.nextUrl.searchParams.get('key') ?? 'qualitative_goal';
  const supabase = getSupabase();
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('user_id', session.userId)
    .eq('setting_key', key)
    .single();
  return NextResponse.json({ value: data?.value ?? '' });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key, value } = await req.json();
  const supabase = getSupabase();
  await supabase
    .from('settings')
    .upsert({ user_id: session.userId, setting_key: key, value }, { onConflict: 'user_id,setting_key' });
  return NextResponse.json({ ok: true });
}
