
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lasmunecas',
    port: process.env.DB_PORT || 3306
  });

  try {
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM horas_extras');
    console.log('Total horas_extras:', rows[0].count);
    
    if (rows[0].count > 0) {
      const [sample] = await connection.execute('SELECT * FROM horas_extras LIMIT 1');
      console.log('Sample record:', sample[0]);
    }
    
    const [users] = await connection.execute('SELECT DISTINCT role FROM usuarios');
    console.log('User roles:', users);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await connection.end();
  }
}

checkData();
