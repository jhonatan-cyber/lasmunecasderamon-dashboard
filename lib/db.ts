/* eslint-disable */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { getSQLTimezoneOffset } from './timezoneService';

const dbTzOffset = getSQLTimezoneOffset();

interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
  waitForConnections?: boolean;
  connectionLimit?: number;
  queueLimit?: number;
}

const defaultConfig: DatabaseConfig & { timezone?: string, multipleStatements?: boolean } = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  timezone: process.env.DB_TZ || dbTzOffset,
  multipleStatements: true
};

const pool = mysql.createPool(defaultConfig);

/**
 * Connection-like interface for transactional queries.
 */
export type TransactionQuery = <R>(sql: string, params?: any[]) => Promise<R>;

/**
 * Executes a SQL query and returns typed results.
 * @template T - The expected return type of the query.
 */
export async function query<T>(sql: string, params: any[] = []): Promise<T> {
  const conn = await pool.getConnection();
  try {
    const dbTz = getSQLTimezoneOffset();
    await conn.query(`SET time_zone = '${dbTz}'`);
    await conn.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
    const [rows] = await conn.query(sql, params);
    return rows as unknown as T;
  } finally {
    conn.release();
  }
}

/**
 * Executes a set of operations within a database transaction.
 * @template T - The expected return type of the transaction block.
 */
export async function withTransaction<T>(
  callback: (trx: <R>(sql: string, params?: any[]) => Promise<R>) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const dbTz = getSQLTimezoneOffset();
    await connection.query(`SET time_zone = '${dbTz}'`);
    await connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");

    const trx = async <R>(sql: string, params: any[] = []): Promise<R> => {
      const [rows] = await connection.query(sql, params);
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

/**
 * Generates a crypto-secure UUID v4.
 */
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

