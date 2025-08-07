import mysql from 'mysql2/promise';

// Database connection configuration
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

// Default configuration - replace with your actual database credentials
const defaultConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admin_dashboard',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a connection pool
const pool = mysql.createPool(defaultConfig);

// Function to execute SQL queries
export async function query(sql: string, params: any[] = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Function to execute raw SQL queries (no prepared statements)
export async function rawQuery(sql: string) {
  try {
    const [rows] = await pool.query(sql);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Test the database connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to the database');
    connection.release();
    return true;
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return false;
  }
}

export default {
  query,
  testConnection,
  pool
};
