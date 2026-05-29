import { NextResponse } from 'next/server';
import logger from '@/lib/utils/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    logger.info('[PING][CLIENT_MOUNT]', {
      at: new Date().toISOString(),
      path: body?.path || 'unknown',
      ua: body?.ua || 'unknown'
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.captureException(error, { context: 'Route:ping' });
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
