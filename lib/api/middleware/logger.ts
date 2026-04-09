import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export interface RequestLogData {
  method: string;
  path: string;
  status?: number;
  duration?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export function logRequest(request: NextRequest, response: NextResponse, duration: number): void {
  const path = request.nextUrl.pathname;
  const method = request.method;
  const status = response.status;
  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const userId = (response.headers.get('x-user-id') as string) || undefined;

  const logData: RequestLogData = {
    method,
    path,
    status,
    duration,
    ip,
    userAgent
  };

  if (userId) {
    logData.userId = userId;
  }

  if (status >= 500) {
    logger.error(`[API] ${method} ${path} - ${status} - ${duration}ms`, logData);
  } else if (status >= 400) {
    logger.warn(`[API] ${method} ${path} - ${status} - ${duration}ms`, logData);
  } else {
    logger.info(`[API] ${method} ${path} - ${status} - ${duration}ms`, logData);
  }
}

export function withLogger(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;

      logRequest(request, response, duration);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResponse = NextResponse.json(
        {
          success: false,
          message: 'Error interno del servidor',
          error: { code: 'INTERNAL_ERROR' }
        },
        { status: 500 }
      );

      logRequest(request, errorResponse, duration);

      throw error;
    }
  };
}

export function createLoggerMiddleware() {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const method = request.method;
    const path = request.nextUrl.pathname;

    logger.debug(`[API Request] ${method} ${path}`);

    const response = await NextResponse.next();

    const duration = Date.now() - startTime;
    logRequest(request, response, duration);

    return response;
  };
}
