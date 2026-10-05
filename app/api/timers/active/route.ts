import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { TimerService } from '@/modules/operacion';
import { getNowInBusinessTimezoneISO } from '@/lib/business/timezoneService';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

let lastCleanup = 0;

export const GET = withPublicRoute(async (request: Request) => {
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
