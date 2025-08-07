import rateLimit from 'express-rate-limit';
import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../logger';

// Configuración de rate limiting general
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    error: 'Demasiadas requests desde esta IP, intenta de nuevo en 15 minutos',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      timestamp: new Date().toISOString()
    });
    res.status(429).json({
      success: false,
      message: 'Demasiadas requests desde esta IP, intenta de nuevo en 15 minutos',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

// Rate limiting específico para login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por ventana
  message: {
    error: 'Demasiados intentos de login, intenta de nuevo en 15 minutos',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Login rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED'
    });
  }
});

// Rate limiting para APIs sensibles
export const sensitiveApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 requests por ventana
  message: {
    error: 'Demasiadas requests a APIs sensibles',
    code: 'SENSITIVE_API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Sensitive API rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      timestamp: new Date().toISOString()
    });
    res.status(429).json({
      success: false,
      message: 'Demasiadas requests a APIs sensibles',
      code: 'SENSITIVE_API_RATE_LIMIT_EXCEEDED'
    });
  }
});

// Rate limiting para uploads de archivos
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 uploads por hora
  message: {
    error: 'Demasiados uploads de archivos',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    res.status(429).json({
      success: false,
      message: 'Demasiados uploads de archivos',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    });
  }
});

// Función helper para aplicar rate limiting en APIs de Next.js
export function withRateLimit(limiter: any) {
  return function (handler: any) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      return new Promise((resolve, reject) => {
        limiter(req, res, (result: any) => {
          if (result instanceof Error) {
            return reject(result);
          }
          return resolve(handler(req, res));
        });
      });
    };
  };
}

// Configuración de rate limiting por IP
export const ipBasedLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // máximo 30 requests por minuto por IP
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  message: {
    error: 'Demasiadas requests desde esta IP',
    code: 'IP_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('IP-based rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      timestamp: new Date().toISOString()
    });
    res.status(429).json({
      success: false,
      message: 'Demasiadas requests desde esta IP',
      code: 'IP_RATE_LIMIT_EXCEEDED'
    });
  }
});

export default {
  generalLimiter,
  loginLimiter,
  sensitiveApiLimiter,
  uploadLimiter,
  ipBasedLimiter,
  withRateLimit
}; 