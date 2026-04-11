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
}

const pool = globalThis.__lasMunecasDbPool ?? mysql.createPool(defaultConfig);

if (!globalThis.__lasMunecasDbPool) {
  globalThis.__lasMunecasDbPool = pool;
}

pool.on('connection', async (connection: any) => {
  try {
    const promiseConnection = connection.promise();
    await promiseConnection.query(`SET time_zone = '${getSQLTimezoneOffset()}'`);
    await promiseConnection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
  } catch (err) {
    console.error('Error initializing connection:', err);
  }
});


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
  const safeParams = (params || []).map(p => (p === undefined ? null : p));

  try {
    const [rows] = safeParams.length > 0
      ? await pool.execute(sql, safeParams)
      : await pool.query(sql);

    return (rows || []) as T;
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


