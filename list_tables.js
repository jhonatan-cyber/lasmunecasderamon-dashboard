const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function listTables() {
  const conn = await mysql.createConnection(config);
  try {
    const [tables] = await conn.query('SHOW TABLES');
    console.log('Tables:', JSON.stringify(tables, null, 2));
    
    // Check clients table structure
    const [columns] = await conn.query('SHOW COLUMNS FROM clientes');
    console.log('Columns in clientes:', JSON.stringify(columns, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

listTables();
