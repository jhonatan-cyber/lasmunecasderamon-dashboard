import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

type AuditDetails = Record<string, unknown>;

let loggerInstance: any = null;

const getLogger = () => {
  if (loggerInstance) return loggerInstance;

  if (typeof window === 'undefined') {
    const winston = require('winston');
    const path = require('path');

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    );

    const winstonLogger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          maxsize: 5242880,
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'combined.log'),
          maxsize: 5242880,
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'audit.log'),
          level: 'info',
          maxsize: 5242880,
          maxFiles: 10
        })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      winstonLogger.add(
        new winston.transports.Console({
          format: consoleFormat
        })
      );
    }
    loggerInstance = winstonLogger;
  } else {
    loggerInstance = {
      // eslint-disable-next-line no-console
      info: (msg: string, meta: any) => console.info(`[INFO] ${msg}`, meta),
      warn: (msg: string, meta: any) => console.warn(`[WARN] ${msg}`, meta),
      error: (msg: string, meta: any) => console.error(`[ERROR] ${msg}`, meta),
      // eslint-disable-next-line no-console
      debug: (msg: string, meta: any) => console.info(`[DEBUG] ${msg}`, meta),
      add: () => {},
      remove: () => {}
    };
  }
  return loggerInstance;
};

export const logger = {
  info: (msg: string, meta?: any) => getLogger().info(msg, meta),
  warn: (msg: string, meta?: any) => getLogger().warn(msg, meta),
  error: (msg: string, meta?: any) => getLogger().error(msg, meta),
  debug: (msg: string, meta?: any) => getLogger().debug(msg, meta)
};

export const auditLogger = {
  login: (userId: string, ip: string, success: boolean) => {
    logger.info('Login attempt', {
      userId,
      ip,
      success,
      timestamp: getNowInBusinessTimezone(),
      actionType: 'LOGIN'
    });
  },

  logout: (userId: string, ip: string) => {
    logger.info('Logout', {
      userId,
      ip,
      timestamp: getNowInBusinessTimezone(),
      actionType: 'LOGOUT'
    });
  },

  dataAccess: (userId: string, action: string, resource: string, details?: AuditDetails) => {
    logger.info('Data access', {
      userId,
      action,
      resource,
      details,
      timestamp: getNowInBusinessTimezone(),
      actionType: 'DATA_ACCESS'
    });
  },

  securityEvent: (userId: string, event: string, details: AuditDetails) => {
    logger.warn('Security event', {
      userId,
      event,
      details,
      timestamp: getNowInBusinessTimezone(),
      actionType: 'SECURITY_EVENT'
    });
  },

  error: (error: Error, context?: AuditDetails) => {
    logger.error('Application error', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: getNowInBusinessTimezone(),
      actionType: 'ERROR'
    });
  }
};

export default logger;
