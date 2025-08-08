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

console.log('🔍 Database Configuration:', {
  host: defaultConfig.host,
  user: defaultConfig.user,
  database: defaultConfig.database,
  port: defaultConfig.port,
  passwordSet: !!defaultConfig.password
});

// Create a connection pool
const pool = mysql.createPool(defaultConfig);

console.log('📊 Connection pool created successfully');

// Function to execute SQL queries
export async function query(sql: string, params: any[] = []) {
  console.log('🔍 Executing query:', sql);
  console.log('🔍 Query parameters:', params);
  
  try {
    console.log('📡 Attempting to execute query...');
    const [rows] = await pool.execute(sql, params);
    console.log('✅ Query executed successfully');
    console.log('📊 Query result rows:', Array.isArray(rows) ? rows.length : 'Not an array');
    return rows;
  } catch (error) {
    console.error('❌ Database query error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState
    });
    throw error;
  }
}

// Function to execute raw SQL queries (no prepared statements)
export async function rawQuery(sql: string) {
  console.log('🔍 Executing raw query:', sql);
  
  try {
    console.log('📡 Attempting to execute raw query...');
    const [rows] = await pool.query(sql);
    console.log('✅ Raw query executed successfully');
    return rows;
  } catch (error) {
    console.error('❌ Database raw query error:', error);
    throw error;
  }
}

// Test the database connection
export async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('📊 Connection config:', {
    host: defaultConfig.host,
    user: defaultConfig.user,
    database: defaultConfig.database,
    port: defaultConfig.port
  });
  
  try {
    console.log('📡 Attempting to get connection from pool...');
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to the database');
    console.log('📊 Connection details:', {
      threadId: connection.threadId
    });
    connection.release();
    console.log('🔓 Connection released back to pool');
    return true;
  } catch (error) {
    console.error('❌ Error connecting to the database:', error);
    console.error('❌ Connection error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState
    });
    return false;
  }
}

export default {
  query,
  testConnection,
  pool
};
