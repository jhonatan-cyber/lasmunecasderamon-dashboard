import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log('[PING][CLIENT_MOUNT]', {
      at: new Date().toISOString(),
      path: body?.path || 'unknown',
      ua: body?.ua || 'unknown'
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PING][ERROR]', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
