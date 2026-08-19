import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data } = await supabase
    .from('goals')
    .select('id, name, description, deadline')
    .eq('user_id', session.userId)
    .order('created_at');
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, deadline } = await req.json();
  const supabase = getSupabase();
  const { data } = await supabase
    .from('goals')
    .insert({ user_id: session.userId, name, description: description ?? '', deadline: deadline ?? null })
    .select('id, name, description, deadline')
    .single();
  return NextResponse.json(data, { status: 201 });
}
