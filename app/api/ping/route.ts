import { withPublicRoute } from '@/lib/api';
import { ApiResponse } from '@/lib/api';
import logger from '@/lib/utils/logger';

export const POST = withPublicRoute(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  logger.info('[PING][CLIENT_MOUNT]', {
    at: new Date().toISOString(),
    path: body?.path || 'unknown',
    ua: body?.ua || 'unknown'
  });
  return ApiResponse.success(null);
});
