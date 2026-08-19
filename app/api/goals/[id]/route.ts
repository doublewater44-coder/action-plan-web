import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { name, description, deadline } = await req.json();
  await query(
    'UPDATE goals SET name=$1, description=$2, deadline=$3 WHERE id=$4 AND user_id=$5',
    [name, description ?? '', deadline ?? null, id, session.userId]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await query('DELETE FROM goals WHERE id=$1 AND user_id=$2', [id, session.userId]);
  return NextResponse.json({ ok: true });
}
