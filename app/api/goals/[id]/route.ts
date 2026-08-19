import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { name, description, deadline } = await req.json();
  const supabase = getSupabase();
  await supabase
    .from('goals')
    .update({ name, description: description ?? '', deadline: deadline ?? null })
    .eq('id', id)
    .eq('user_id', session.userId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();
  await supabase.from('goals').delete().eq('id', id).eq('user_id', session.userId);
  return NextResponse.json({ ok: true });
}
