const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306', 10)
};

async function main() {
  const connection = await mysql.createConnection(config);
  try {
    const [rows] = await connection.query(
      "SELECT * FROM audit_logs WHERE action = 'PUT /api/users FORBIDDEN' ORDER BY created_at DESC LIMIT 5"
    );
    console.log('Forbidden profile updates:', JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error fetching logs:', error);
  } finally {
    await connection.end();
  }
}

main();
