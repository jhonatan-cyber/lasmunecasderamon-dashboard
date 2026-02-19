import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { logger } from '../logger';

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;"
};

export function withSecurityHeaders(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return handler(req, res);
  };
}

export function validateInput(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { method } = req;
    if ((method === 'POST' || method === 'PUT') && req.body) {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      const maxSize = 10 * 1024 * 1024;

      if (contentLength > maxSize) {
        logger.warn('Request body too large', {
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          contentLength,
          maxSize,
          path: req.url
        });

        return res.status(413).json({
          success: false,
          message: 'Payload too large',
          code: 'PAYLOAD_TOO_LARGE'
        });
      }
    }

    if (method === 'POST' || method === 'PUT') {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json',
          code: 'INVALID_CONTENT_TYPE'
        });
      }
    }

    return handler(req, res);
  };
}

export function sanitizeInput(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        const value = req.query[key];
        if (typeof value === 'string') {
          req.query[key] = value.replace(/[<>]/g, '');
        }
      });
    }

    if (req.body && typeof req.body === 'object') {
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return obj.replace(/[<>]/g, '');
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }
        if (typeof obj === 'object' && obj !== null) {
          const sanitized: any = {};
          Object.keys(obj).forEach(key => {
            sanitized[key] = sanitizeObject(obj[key]);
          });
          return sanitized;
        }
        return obj;
      };

      req.body = sanitizeObject(req.body);
    }

    return handler(req, res);
  };
}

export function validateMethod(allowedMethods: string[]) {
  return function (handler: NextApiHandler) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const { method } = req;

      if (!method || !allowedMethods.includes(method)) {
        logger.warn('Invalid HTTP method', {
          method,
          allowedMethods,
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          path: req.url
        });

        res.setHeader('Allow', allowedMethods);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`,
          code: 'METHOD_NOT_ALLOWED',
          allowedMethods
        });
      }

      return handler(req, res);
    };
  };
}

export function validateOrigin(allowedOrigins: string[]) {
  return function (handler: NextApiHandler) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const origin = req.headers.origin;

      if (origin && !allowedOrigins.includes(origin)) {
        logger.warn('Invalid origin', {
          origin,
          allowedOrigins,
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          path: req.url
        });

        return res.status(403).json({
          success: false,
          message: 'Origin not allowed',
          code: 'ORIGIN_NOT_ALLOWED'
        });
      }

      return handler(req, res);
    };
  };
}

export function requestLogger(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    return handler(req, res);
  };
}

export function withSecurity(handler: NextApiHandler) {
  return withSecurityHeaders(validateInput(sanitizeInput(requestLogger(handler))));
}

export default {
  withSecurityHeaders,
  validateInput,
  sanitizeInput,
  validateMethod,
  validateOrigin,
  requestLogger,
  withSecurity,
  securityHeaders
};
