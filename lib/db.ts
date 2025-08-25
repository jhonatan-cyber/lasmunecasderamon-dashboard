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
  database: process.env.DB_NAME || 'nuwesoft',
  port: parseInt(process.env.DB_PORT || '3307'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a connection pool
const pool = mysql.createPool(defaultConfig);

// Function to create a direct connection (more reliable for production)
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
    console.error('❌ [DB] Error al conectar:', error);
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
    console.error('❌ Database query error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState
    });
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Function to execute raw SQL queries (no prepared statements)
export async function rawQuery(sql: string) {
  let connection;
  try {
    connection = await createConnection();
    const [rows] = await connection.query(sql);
    return rows;
  } catch (error) {
    console.error('❌ Database raw query error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Test the database connection
export async function testConnection() {
  try {
    const connection = await createConnection();
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ [DB] Error en prueba de conexión:', error);
    console.error('❌ [DB] Detalles del error:', {
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
