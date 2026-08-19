import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'no session' });

  const supabase = getSupabase();
  const { data: goals, error } = await supabase
    .from('goals')
    .select('id, name, user_id');

  return NextResponse.json({
    sessionUserId: session.userId,
    sessionUserIdType: typeof session.userId,
    goalsAll: goals,
    goalsError: error?.message,
  });
}
