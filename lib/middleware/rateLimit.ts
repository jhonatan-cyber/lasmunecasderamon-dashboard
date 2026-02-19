import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { logger } from '../logger';

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

      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
      const key = `rate_limit:${clientIP}`;
      const now = Date.now();

      const current = rateLimitStore.get(key);

      if (!current || now > current.resetTime) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs
        });
      } else if (current.count >= max) {
        logger.warn('Rate limit exceeded', {
          ip: clientIP,
          userAgent: req.headers['user-agent'],
          path: req.url
        });

        return res.status(429).json({
          success: false,
          message: 'Demasiadas requests, intenta de nuevo más tarde',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      } else {
        current.count++;
      }

      return handler(req, res);
    };
  };
}

export const loginLimiter = createRateLimiter(15 * 60 * 1000, 5);
export const generalLimiter = createRateLimiter(15 * 60 * 1000, 100);
export const sensitiveApiLimiter = createRateLimiter(5 * 60 * 1000, 20);

export function withRateLimit(limiter: any) {
  return function (handler: any) {
    return limiter(handler);
  };
}

export default {
  loginLimiter,
  generalLimiter,
  sensitiveApiLimiter,
  withRateLimit
};
