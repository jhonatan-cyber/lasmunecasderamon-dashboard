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
  connectionLimit: 50,
  queueLimit: 0,
  timezone: dbTzOffset,
  multipleStatements: true,
  dateStrings: true
};

const pool = mysql.createPool(defaultConfig);

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
export async function query<T>(sql: string, params: any[] = []): Promise<T> {
  const safeParams = (params || []).map(p => (p === undefined ? null : p));

  try {
    const [rows] = safeParams.length > 0
      ? await pool.execute(sql, safeParams)
      : await pool.query(sql);

    return (rows || []) as unknown as T;
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

export default {
  query,
  withTransaction,
  testConnection,
  pool,
  generateUUID
};
