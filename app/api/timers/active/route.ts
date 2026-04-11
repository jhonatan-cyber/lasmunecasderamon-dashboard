import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { TimerRepository } from '@/lib/repositories/TimerRepository';
import { getNowInBusinessTimezoneISO } from '@/lib/business/timezoneService';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

let lastCleanup = 0;

export const GET = withAppApiWrapper(async (request: Request) => {
  const businessNowISO = getNowInBusinessTimezoneISO();
  const nowMs = new Date(businessNowISO).getTime();

  if (nowMs - lastCleanup > 10000) {
    lastCleanup = nowMs;
    TimerRepository.runAutoCleanup().catch(err =>
      logger.error('[timers/active] Auto cleanup failed:', { err })
    );
  }

  const data = await TimerRepository.getActive();
  return NextResponse.json({ success: true, data, serverTime: getNowInBusinessTimezoneISO() });
});
