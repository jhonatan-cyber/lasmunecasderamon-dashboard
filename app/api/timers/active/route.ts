import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { TimerRepository } from '@/lib/repositories/TimerRepository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export const dynamic = 'force-dynamic';

let lastCleanup = 0;

export const GET = withAppApiWrapper(async () => {
  const now = Date.now();
  if (now - lastCleanup > 10000) {
    lastCleanup = now;
    TimerRepository.runAutoCleanup().catch(console.error);
  }

  const data = await TimerRepository.getActive();
  return NextResponse.json({ success: true, data, serverTime: getNowInBusinessTimezone() });
});
