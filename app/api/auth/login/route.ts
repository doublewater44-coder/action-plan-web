import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { queryOne } from '@/lib/db';
import { signToken, cookieOptions, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: '入力してください' }, { status: 400 });
  }

  const user = await queryOne<{ id: number; display_name: string; password_hash: string }>(
    'SELECT id, display_name, password_hash FROM users WHERE username = $1',
    [username.trim().toLowerCase()]
  );

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: 'ユーザー名またはパスワードが違います' }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, displayName: user.display_name });
  const res = NextResponse.json({ ok: true, displayName: user.display_name });
  res.cookies.set(COOKIE_NAME, token, cookieOptions());
  return res;
}
