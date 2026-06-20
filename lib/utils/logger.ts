import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

type AuditDetails = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
}

const formatPayload = (payload: unknown): Record<string, unknown> | undefined => {
  if (!payload) return undefined;
  if (payload instanceof Error) {
    return {
      message: payload.message,
      name: payload.name,
      stack: payload.stack,
      ...Object.getOwnPropertyNames(payload).reduce<Record<string, unknown>>((acc, key) => {
        if (key !== 'message' && key !== 'name' && key !== 'stack') {
          acc[key] = (payload as unknown as Record<string, unknown>)[key];
        }
        return acc;
      }, {})
    };
  }

  if (typeof payload === 'object') {
    return JSON.parse(JSON.stringify(payload, (_, value) => (value === undefined ? null : value)));
  }

  return { value: payload };
};

const makeLogEntry = (
  level: string,
  message: string,
  meta?: Record<string, unknown>
): LogEntry => ({
  timestamp: new Date().toISOString(),
  level,
  message,
  meta: formatPayload(meta)
});


const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

let loggerInstance: any = null;
let consoleOverridden = false;

const overrideConsole = (winstonLogger: any) => {
  if (consoleOverridden) return;
  consoleOverridden = true;

  const safeStringify = (a: unknown): string => {
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    }
    return String(a);
  };

  console.log = (...args: unknown[]) => {
    winstonLogger.info(args.map(safeStringify).join(' '));
  };
  console.warn = (...args: unknown[]) => {
    winstonLogger.warn(args.map(safeStringify).join(' '));
  };
  console.error = (...args: unknown[]) => {
    winstonLogger.error(args.map(safeStringify).join(' '));
  };
  console.info = (...args: unknown[]) => {
    winstonLogger.info(args.map(safeStringify).join(' '));
  };
  console.debug = (...args: unknown[]) => {
    winstonLogger.debug(args.map(safeStringify).join(' '));
  };
};

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

    
    
    if (process.env.NODE_ENV === 'production') {
      overrideConsole(winstonLogger);
    }

    loggerInstance = winstonLogger;
  } else {
    
    loggerInstance = {
      info: (msg: string, meta?: unknown) => {
        originalConsole.info(
          JSON.stringify(makeLogEntry('info', msg, meta as Record<string, unknown>))
        );
      },
      warn: (msg: string, meta?: unknown) => {
        originalConsole.warn(
          JSON.stringify(makeLogEntry('warn', msg, meta as Record<string, unknown>))
        );
      },
      error: (msg: string, meta?: unknown) => {
        originalConsole.error(
          JSON.stringify(makeLogEntry('error', msg, meta as Record<string, unknown>))
        );
      },
      debug: (msg: string, meta?: unknown) => {
        if (process.env.NODE_ENV !== 'production') {
          originalConsole.debug(
            JSON.stringify(makeLogEntry('debug', msg, meta as Record<string, unknown>))
          );
        }
      },
      add: () => {},
      remove: () => {}
    };
  }
  return loggerInstance;
};

export const logger = {
  info: (msg: string, meta?: unknown) => getLogger().info(msg, meta),
  warn: (msg: string, meta?: unknown) => getLogger().warn(msg, meta),
  error: (msg: string, meta?: unknown) => getLogger().error(msg, meta),
  debug: (msg: string, meta?: unknown) => getLogger().debug(msg, meta),

  
  captureException: (error: unknown, meta?: Record<string, unknown>) => {
    getLogger().error(error instanceof Error ? error.message : String(error), {
      ...meta,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
  }
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
