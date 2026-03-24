const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function check() {
  const conn = await mysql.createConnection(config);
  try {
    const [rows] = await conn.query('SHOW CREATE TABLE clientes');
    console.log('CREATE TABLE clientes:', rows[0]['Create Table']);
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

check();
