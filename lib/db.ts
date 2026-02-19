import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
  waitForConnections?: boolean;
  connectionLimit?: number;
  queueLimit?: number;
}

const defaultConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nuwesoft',
  port: parseInt(process.env.DB_PORT || '3307'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(defaultConfig);

async function createConnection() {
  try {
    const connection = await mysql.createConnection({
      host: defaultConfig.host,
      user: defaultConfig.user,
      password: defaultConfig.password,
      database: defaultConfig.database,
      port: defaultConfig.port
    });
    return connection;
  } catch (error) {
    throw error;
  }
}

// Function to execute SQL queries
export async function query(sql: string, params: any[] = []) {
  let connection;
  try {
    connection = await createConnection();
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function rawQuery(sql: string) {
  let connection;
  try {
    connection = await createConnection();
    const [rows] = await connection.query(sql);
    return rows;
  } catch (error) {
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function testConnection() {
  try {
    const connection = await createConnection();
    await connection.end();
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
