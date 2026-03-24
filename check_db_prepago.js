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
    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('All Tables:', tableNames.join(', '));
    
    if (tableNames.includes('anticipos')) {
        const [cols] = await conn.query('SHOW COLUMNS FROM anticipos');
        console.log('Columns in anticipos:', JSON.stringify(cols, null, 2));
    }

    if (tableNames.includes('clientes')) {
        const [cols] = await conn.query('SHOW COLUMNS FROM clientes');
        console.log('Columns in clientes:', JSON.stringify(cols, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

check();
