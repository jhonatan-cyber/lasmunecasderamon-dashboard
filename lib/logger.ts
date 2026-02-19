import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [

    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),

    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Logs de auditoría
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'audit.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// Agregar transporte de consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Funciones helper para logging específico
export const auditLogger = {
  login: (userId: number, ip: string, success: boolean) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Login attempt', {
        userId,
        ip,
        success,
        timestamp: new Date().toISOString(),
        actionType: 'LOGIN'
      });
    }
  },

  logout: (userId: number, ip: string) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Logout', {
        userId,
        ip,
        timestamp: new Date().toISOString(),
        actionType: 'LOGOUT'
      });
    }
  },

  dataAccess: (userId: number, action: string, resource: string, details?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Data access', {
        userId,
        action,
        resource,
        details,
        timestamp: new Date().toISOString(),
        actionType: 'DATA_ACCESS'
      });
    }
  },

  securityEvent: (userId: number, event: string, details: any) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Security event', {
        userId,
        event,
        details,
        timestamp: new Date().toISOString(),
        actionType: 'SECURITY_EVENT'
      });
    }
  },

  error: (error: Error, context?: any) => {
    logger.error('Application error', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      actionType: 'ERROR'
    });
  }
};

export default logger; 