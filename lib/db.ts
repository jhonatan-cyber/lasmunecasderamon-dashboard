import mysql from 'mysql2/promise';

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

const defaultConfig: DatabaseConfig & { timezone?: string } = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  timezone: process.env.DB_TZ || 'Z'
};
const pool = mysql.createPool(defaultConfig);

export async function query(sql: string, params: any[] = []): Promise<any> {
  const conn = await pool.getConnection();
  try {
    await conn.query("SET time_zone = '+00:00'");
    await conn.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    conn.release();
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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default {
  query,
  testConnection,
  pool,
  generateUUID
};
