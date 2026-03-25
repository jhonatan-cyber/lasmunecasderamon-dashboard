import { NextResponse } from 'next/server';
import { TimerRepository } from '@/lib/repositories/TimerRepository';

export const dynamic = 'force-dynamic';

let lastCleanup = 0;

export async function GET() {
  try {
    const now = Date.now();
    if (now - lastCleanup > 10000) {
      lastCleanup = now;
      TimerRepository.runAutoCleanup().catch(console.error);
    }

    const data = await TimerRepository.getActive();
    return NextResponse.json({ success: true, data, serverTime: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting timers', error: error.message }, { status: 500 });
  }
}
