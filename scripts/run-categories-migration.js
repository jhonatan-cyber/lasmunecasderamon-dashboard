const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3307'),
    multipleStatements: true
  });

  try {
    console.log('Conectado a la base de datos');

    // Leer el archivo de migración
    const migrationFile = path.join(__dirname, '..', 'database', 'migrations', 'add_display_order_to_categorias.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Ejecutando migración...');
    await connection.query(sql);
    console.log('✅ Migración ejecutada exitosamente');

  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
