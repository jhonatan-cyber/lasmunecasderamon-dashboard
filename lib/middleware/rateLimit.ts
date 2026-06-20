import { NextRequest, NextResponse } from 'next/server';
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { logger } from '@/lib/utils/logger';

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

export function createRateLimiter(windowMs: number, max: number) {
  return function (handler: NextApiHandler) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      cleanupExpiredEntries();

      const clientIP =
        req.headers['x-forwarded-for'] || (req as any).connection?.remoteAddress || 'unknown';
      const key = `rate_limit:${clientIP}`;
      const now = Date.now();

      const current = rateLimitStore.get(key);

      if (!current || now > current.resetTime) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs
        });

        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(max - 1));
        res.setHeader('RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
      } else if (current.count >= max) {
        const resetTime = Math.ceil(current.resetTime / 1000);
        const retryAfter = Math.max(0, resetTime - Math.ceil(Date.now() / 1000));

        logger.warn('Rate limit exceeded', {
          ip: clientIP,
          userAgent: req.headers['user-agent'],
          path: req.url
        });

        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', '0');
        res.setHeader('Retry-After', String(retryAfter));

        return res.status(429).json({
          success: false,
          message: 'Demasiadas requests, intenta de nuevo más tarde',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      } else {
        current.count++;

        const remaining = max - current.count;
        const resetTime = Math.ceil(current.resetTime / 1000);

        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(remaining));
        res.setHeader('RateLimit-Reset', String(resetTime));
      }

      return handler(req, res);
    };
  };
}

export const loginLimiter = createRateLimiter(60 * 1000, 5);
export const generalLimiter = createRateLimiter(15 * 60 * 1000, 100);
export const sensitiveApiLimiter = createRateLimiter(5 * 60 * 1000, 20);

export function withRateLimit(
  limiter: (handler: NextApiHandler) => (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return function (handler: NextApiHandler) {
    return limiter(handler);
  };
}

const rateLimitStoreApp = new Map<string, { count: number; resetTime: number }>();

const cleanupExpiredEntriesApp = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitStoreApp.entries()) {
    if (now > value.resetTime) {
      rateLimitStoreApp.delete(key);
    }
  }
};

export function createAppRouterLimiter(windowMs: number, max: number) {
  type AppRouterHandler = (request: NextRequest) => Promise<NextResponse>;

  return function (handler: AppRouterHandler): AppRouterHandler {
    return async function (request: NextRequest): Promise<NextResponse> {
      cleanupExpiredEntriesApp();

      const forwarded = request.headers.get('x-forwarded-for');
      const clientIP = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const key = `rate_limit:${clientIP}`;
      const now = Date.now();

      const current = rateLimitStoreApp.get(key);

      if (!current || now > current.resetTime) {
        rateLimitStoreApp.set(key, {
          count: 1,
          resetTime: now + windowMs
        });
      } else if (current.count >= max) {
        logger.warn('Rate limit exceeded', {
          ip: clientIP,
          userAgent,
          path: request.nextUrl.pathname
        });

        const resetTime = Math.ceil(current.resetTime / 1000);
        const retryAfter = Math.max(0, resetTime - Math.ceil(Date.now() / 1000));

        return NextResponse.json(
          {
            success: false,
            message: 'Demasiadas requests, intenta de nuevo más tarde',
            code: 'RATE_LIMIT_EXCEEDED'
          },
          {
            status: 429,
            headers: {
              'RateLimit-Limit': String(max),
              'RateLimit-Remaining': '0',
              'Retry-After': String(retryAfter)
            }
          }
        );
      } else {
        current.count++;
      }

      const response = await handler(request);

      const currentState = rateLimitStoreApp.get(key);
      if (currentState) {
        const remaining = Math.max(0, max - currentState.count);
        response.headers.set('RateLimit-Limit', String(max));
        response.headers.set('RateLimit-Remaining', String(remaining));
        response.headers.set('RateLimit-Reset', String(Math.ceil(currentState.resetTime / 1000)));
      }

      return response;
    };
  };
}

export const loginLimiterApp = createAppRouterLimiter(60 * 1000, 5);
export const generalLimiterApp = createAppRouterLimiter(15 * 60 * 1000, 100);
export const sensitiveApiLimiterApp = createAppRouterLimiter(5 * 60 * 1000, 20);

export const rateLimitMiddleware = {
  loginLimiter,
  generalLimiter,
  sensitiveApiLimiter,
  withRateLimit,
  createRateLimiter,

  createAppRouterLimiter,
  loginLimiterApp,
  generalLimiterApp,
  sensitiveApiLimiterApp
};

export default rateLimitMiddleware;
