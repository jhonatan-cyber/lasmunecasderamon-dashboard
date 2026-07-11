import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { getSQLTimezoneOffset } from '@/lib/business/timezoneService';
import { env } from '@/lib/utils/env';

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

// ponytail: lazy pool getter — always reads from globalThis so pool
// recreation after connection loss is reflected everywhere
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
    const hasLimitOrOffset = /LIMIT\s+\?|OFFSET\s+\?/i.test(sql);

    if (hasLimitOrOffset && safeParams.length > 0) {
      let finalSql = sql;
      let paramIndex = 0;

      finalSql = sql.replace(/\?/g, () => {
        if (paramIndex < safeParams.length) {
          const param = safeParams[paramIndex++];
          if (typeof param === 'string') {
            return `'${param.replace(/'/g, "''")}'`;
          }
          return param;
        }
        return '?';
      });

      const [rows] = await pool.query(finalSql);
      return (rows || []) as T;
    } else {
      const [rows] =
        safeParams.length > 0 ? await pool.execute(sql, safeParams) : await pool.query(sql);

      return (rows || []) as T;
    }
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
      // ponytail: destroy stale pool, clear globalThis, retry
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
  return executeQuery<T>(sql, params);
}

export async function withTransaction<T>(
  callback: (trx: <R>(sql: string, params?: any[]) => Promise<R>) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();
  await connection.beginTransaction();

  try {
    const trx = async <R>(sql: string, params: any[] = []): Promise<R> => {
      const [rows] = await connection.execute(sql, params);
      return rows as unknown as R;
    };

    const result = await callback(trx);
    await connection.commit();
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
