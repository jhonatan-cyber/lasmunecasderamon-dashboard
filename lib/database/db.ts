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
  charset: 'utf8mb4'
};

declare global {
  var __lasMunecasDbPool: mysql.Pool | undefined;
  var __lasMunecasDbPoolListenersAttached: boolean | undefined;
}

const pool = globalThis.__lasMunecasDbPool ?? mysql.createPool(defaultConfig);

if (!globalThis.__lasMunecasDbPool) {
  globalThis.__lasMunecasDbPool = pool;
}

if (!globalThis.__lasMunecasDbPoolListenersAttached) {
  pool.on('connection', async (connection: any) => {
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

export type TransactionQuery = <R>(sql: string, params?: any[]) => Promise<R>;

/**
 * Database query function - returns an array of objects by default
 * Use query<SpecificType[]>(...) for typed results
 *
 * @example
 * const users = await query<{id: number, name: string}[]>('SELECT id, name FROM users')
 * const rows = await query('SELECT * FROM users') // returns any[] - access properties directly
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const safeParams = (params || []).map(p => {
    if (p === undefined) return null;
    if (typeof p === 'string' && /^\d+$/.test(p)) {
      return parseInt(p, 10);
    }
    return p;
  });

  try {
    // Check if SQL contains LIMIT or OFFSET clauses - these cause issues with prepared statements in MySQL 8.4.7
    const hasLimitOrOffset = /LIMIT\s+\?|OFFSET\s+\?/i.test(sql);

    if (hasLimitOrOffset && safeParams.length > 0) {
      // For queries with LIMIT/OFFSET, use manual parameter replacement
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
      // For other queries, use prepared statements normally
      const [rows] =
        safeParams.length > 0 ? await pool.execute(sql, safeParams) : await pool.query(sql);

      return (rows || []) as T;
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Database query failed:', { sql, safeParams, error });
    }
    throw error;
  }
}

export async function withTransaction<T>(
  callback: (trx: <R>(sql: string, params?: any[]) => Promise<R>) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
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
  const [rows] = await pool.query(sql);
  return rows;
}

export async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 1');
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
  pool,
  generateUUID
};

export default database;
