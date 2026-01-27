const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
  const sql = fs.readFileSync('sql/migration_add_comision_anfitriona.sql', 'utf8');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lasmunecasderamon',
    multipleStatements: true,
  });
  try {
    await connection.query(sql);
    console.log('Migración ejecutada correctamente.');
  } catch (err) {
    console.error('Error al ejecutar la migración:', err);
  } finally {
    await connection.end();
  }
}

runMigration();
