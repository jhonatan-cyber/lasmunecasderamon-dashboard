import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { logger } from '../logger';

// Almacén simple para rate limiting (en producción usar Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Función para limpiar entradas expiradas
const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Rate limiting simple
export function createRateLimiter(windowMs: number, max: number) {
  return function(handler: NextApiHandler) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Limpiar entradas expiradas
      cleanupExpiredEntries();

      const clientIP = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      'unknown';
      const key = `rate_limit:${clientIP}`;
      const now = Date.now();

      const current = rateLimitStore.get(key);
      
      if (!current || now > current.resetTime) {
        // Primera request o ventana expirada
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs
        });
      } else if (current.count >= max) {
        // Rate limit excedido
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
        // Incrementar contador
        current.count++;
      }

      return handler(req, res);
    };
  };
}

// Rate limiters específicos
export const loginLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 intentos en 15 minutos
export const generalLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests en 15 minutos
export const sensitiveApiLimiter = createRateLimiter(5 * 60 * 1000, 20); // 20 requests en 5 minutos

// Función helper para aplicar rate limiting
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