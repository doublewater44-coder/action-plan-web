import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { username, displayName, password } = await req.json();
  if (!username?.trim() || !displayName?.trim() || !password) {
    return NextResponse.json({ error: 'すべての項目を入力してください' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'パスワードは6文字以上にしてください' }, { status: 400 });
  }

  const hash = bcrypt.hashSync(password, 10);
  const supabase = getSupabase();
  const { error } = await supabase.from('users').insert({
    username: username.trim().toLowerCase(),
    display_name: displayName.trim(),
    password_hash: hash,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'そのユーザー名は既に使われています' }, { status: 409 });
    }
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
