import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { TimerService } from '@/modules/operacion';
import { getNowInBusinessTimezoneISO } from '@/lib/business/timezoneService';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

let lastCleanup = 0;
let cleanup: Promise<void> | null = null;

export const GET = withPublicRoute(async (request: Request) => {
  const businessNowISO = getNowInBusinessTimezoneISO();
  const nowMs = new Date(businessNowISO).getTime();

  const finalizeExpired = new URL(request.url).searchParams.get('cleanup') === 'expired';
  if (!cleanup && (finalizeExpired || nowMs - lastCleanup > 10000)) {
    cleanup = TimerService.runAutoCleanup()
      .then(() => {
        lastCleanup = nowMs;
      })
      .catch(err => {
        logger.error('[timers/active] Auto cleanup failed:', { err });
        throw err;
      })
      .finally(() => {
        cleanup = null;
      });
  }
  if (cleanup) await cleanup;

  const data = await TimerService.getActive();
  return NextResponse.json({ success: true, data, serverTime: getNowInBusinessTimezoneISO() });
});
