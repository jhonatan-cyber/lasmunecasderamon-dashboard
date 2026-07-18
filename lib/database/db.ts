import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { getSQLTimezoneOffset } from '@/lib/business/timezoneService';
import { env } from '@/lib/utils/env';
import { logger } from '@/lib/utils/logger';
import { QueryLogRepository } from '@/lib/repositories/QueryLogRepository';

const SLOW_QUERY_THRESHOLD_MS = 50;

const dbTzOffset = getSQLTimezoneOffset();

const defaultConfig: any = {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: dbTzOffset,
  dateStrings: true,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 60000
};

declare global {
  var __lasMunecasDbPool: mysql.Pool | undefined;
  var __lasMunecasDbPoolListenersAttached: boolean | undefined;
}

function getPool(): mysql.Pool {
  if (!globalThis.__lasMunecasDbPool) {
    globalThis.__lasMunecasDbPool = mysql.createPool(defaultConfig);

    if (!globalThis.__lasMunecasDbPoolListenersAttached) {
      globalThis.__lasMunecasDbPool.on('connection', async (connection: any) => {
        try {
          const promiseConnection = connection.promise();
          await promiseConnection.query(`SET time_zone = '${getSQLTimezoneOffset()}'`);
          await promiseConnection.query(
            "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))"
          );
        } catch (err) {
          console.error('Error initializing connection:', err);
        }
      });

      globalThis.__lasMunecasDbPoolListenersAttached = true;
    }
  }

  return globalThis.__lasMunecasDbPool;
}

export type TransactionQuery = <R>(sql: string, params?: any[]) => Promise<R>;

async function executeQuery<T>(sql: string, params: any[], attempt = 0): Promise<T> {
  const safeParams = (params || []).map(p => {
    if (p === undefined) return null;
    if (typeof p === 'string' && /^\d+$/.test(p)) {
      return parseInt(p, 10);
    }
    return p;
  });

  try {
    const pool = getPool();
    const isLimitQuery = /\blimit\b/i.test(sql);
    const [rows] =
      safeParams.length > 0 && !isLimitQuery
        ? await pool.execute(sql, safeParams)
        : await pool.query(sql, safeParams);

    return (rows || []) as T;
  } catch (error: any) {
    const isConnError =
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'PROTOCOL_CONNECTION_LOST' ||
      error?.code === 'ECONNRESET' ||
      error?.code === 'EPIPE' ||
      error?.code === 'POOL_CLOSED';

    if (isConnError && attempt < 2) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DB] Connection lost (attempt ${attempt + 1}/2), recreating pool...`);
      }
      try {
        await globalThis.__lasMunecasDbPool?.end().catch(() => {});
      } catch {}
      globalThis.__lasMunecasDbPool = undefined;
      globalThis.__lasMunecasDbPoolListenersAttached = false;
      return executeQuery<T>(sql, params, attempt + 1);
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Database query failed:', { sql, safeParams, error });
    }
    throw error;
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const start = performance.now();
  try {
    return await executeQuery<T>(sql, params);
  } finally {
    const duration = performance.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      const truncatedSql = sql.length > 200 ? sql.substring(0, 200) + '...' : sql;
      logger.warn(`[DB] Slow query (${duration.toFixed(1)}ms)`, {
        sql: truncatedSql,
        paramsCount: params.length,
        durationMs: Math.round(duration * 10) / 10,
        threshold: SLOW_QUERY_THRESHOLD_MS
      });
      QueryLogRepository.log({
        sql: truncatedSql,
        params_count: params.length,
        duration_ms: Math.round(duration * 10) / 10,
        query_type: 'query'
      });
    }
  }
}

export async function withTransaction<T>(
  callback: (trx: <R>(sql: string, params?: any[]) => Promise<R>) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();
  await connection.beginTransaction();

  let queryCount = 0;
  let totalQueryTime = 0;

  try {
    const trx = async <R>(sql: string, params: any[] = []): Promise<R> => {
      const qStart = performance.now();
      try {
        const [rows] = await connection.execute(sql, params);
        return rows as unknown as R;
      } finally {
        const qDuration = performance.now() - qStart;
        queryCount++;
        totalQueryTime += qDuration;

        if (qDuration > SLOW_QUERY_THRESHOLD_MS) {
          const truncatedSql = sql.length > 200 ? sql.substring(0, 200) + '...' : sql;
          logger.warn(`[DB] Slow query in transaction (${qDuration.toFixed(1)}ms)`, {
            sql: truncatedSql,
            paramsCount: params.length,
            durationMs: Math.round(qDuration * 10) / 10,
            threshold: SLOW_QUERY_THRESHOLD_MS
          });
          QueryLogRepository.log({
            sql: truncatedSql,
            params_count: params.length,
            duration_ms: Math.round(qDuration * 10) / 10,
            query_type: 'transaction_query'
          });
        }
      }
    };

    const txStart = performance.now();
    const result = await callback(trx);
    await connection.commit();

    const txDuration = performance.now() - txStart;
    if (txDuration > SLOW_QUERY_THRESHOLD_MS * 2) {
      logger.warn(`[DB] Slow transaction (${txDuration.toFixed(1)}ms, ${queryCount} queries)`, {
        durationMs: Math.round(txDuration * 10) / 10,
        queryCount,
        avgQueryMs: queryCount > 0 ? Math.round((totalQueryTime / queryCount) * 10) / 10 : 0,
        totalQueryTimeMs: Math.round(totalQueryTime * 10) / 10,
        threshold: SLOW_QUERY_THRESHOLD_MS * 2
      });
      QueryLogRepository.log({
        sql: `Transaction with ${queryCount} queries`,
        params_count: 0,
        duration_ms: Math.round(txDuration * 10) / 10,
        query_type: 'transaction',
        query_count: queryCount,
        avg_query_ms: queryCount > 0 ? Math.round((totalQueryTime / queryCount) * 10) / 10 : 0,
        total_query_time_ms: Math.round(totalQueryTime * 10) / 10
      });
    }

    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function rawQuery(sql: string) {
  const [rows] = await getPool().query(sql);
  return rows;
}

export async function testConnection() {
  try {
    const [rows] = await getPool().query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}

export function generateUUID(): string {
  return randomUUID();
}

const database = {
  query,
  withTransaction,
  testConnection,
  get pool() {
    return getPool();
  },
  generateUUID
};

export default database;
