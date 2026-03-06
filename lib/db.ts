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
  connectionLimit: 20,  // Aumentado para soportar más concurrencia
  queueLimit: 0,
  timezone: '-04:00'
};

// Pool singleton — reutiliza conexiones, no crea una nueva por cada query
const pool = mysql.createPool(defaultConfig);

// Function to execute SQL queries — usa pool (conexiones reutilizadas)
export async function query(sql: string, params: any[] = []) {
  const conn = await pool.getConnection();
  try {
    // conn.query() en lugar de conn.execute() — execute() usa prepared statements
    // que NO soportan subqueries (ej: SET SESSION ... = (SELECT ...)) ni GROUP_CONCAT
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

export default {
  query,
  testConnection,
  pool
};
