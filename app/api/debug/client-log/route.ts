import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message || 'Evento cliente');
    const payload = body?.payload ?? null;

    console.log('[CLIENT_LOG]', message, payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CLIENT_LOG][ERROR]', error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
