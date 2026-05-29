import { NextResponse } from 'next/server';
import logger from '@/lib/utils/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message || 'Evento cliente');
    const payload = body?.payload ?? null;

    logger.info('[CLIENT_LOG]', { message, payload });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.captureException(error, { context: 'Route:clientLog' });
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
