import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { TimerService } from '@/lib/services/TimerService';
import { getNowInBusinessTimezoneISO } from '@/lib/business/timezoneService';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

let lastCleanup = 0;

export const GET = withAppApiWrapper(async (request: Request) => {
  const businessNowISO = getNowInBusinessTimezoneISO();
  const nowMs = new Date(businessNowISO).getTime();

  if (nowMs - lastCleanup > 10000) {
    lastCleanup = nowMs;
    TimerService.runAutoCleanup().catch(err =>
      logger.error('[timers/active] Auto cleanup failed:', { err })
    );
  }

  const data = await TimerService.getActive();
  return NextResponse.json({ success: true, data, serverTime: getNowInBusinessTimezoneISO() });
});
