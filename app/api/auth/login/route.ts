import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';
import { signToken, cookieOptions, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: '入力してください' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from('users')
    .select('id, display_name, password_hash')
    .eq('username', username.trim().toLowerCase())
    .single();

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: 'ユーザー名またはパスワードが違います' }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, displayName: user.display_name });
  const res = NextResponse.json({ ok: true, displayName: user.display_name });
  res.cookies.set(COOKIE_NAME, token, cookieOptions());
  return res;
}
