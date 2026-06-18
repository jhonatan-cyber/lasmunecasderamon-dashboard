const mysql = require('mysql2/promise');

const config = {
  host: '195.200.4.245',
  user: 'nuwesoft',
  password: 'Ancasi96nuwe',
  database: 'lasmunecasderamon',
  port: 3306
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
