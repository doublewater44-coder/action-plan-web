import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { username, displayName, password } = await req.json();
  if (!username?.trim() || !displayName?.trim() || !password) {
    return NextResponse.json({ error: 'すべての項目を入力してください' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'パスワードは6文字以上にしてください' }, { status: 400 });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    await query(
      'INSERT INTO users (username, display_name, password_hash) VALUES ($1, $2, $3)',
      [username.trim().toLowerCase(), displayName.trim(), hash]
    );
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'そのユーザー名は既に使われています' }, { status: 409 });
    }
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
  }
}
