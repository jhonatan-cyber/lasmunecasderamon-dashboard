const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  let connection;
  
  try {
    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ Conectado a la base de datos');

    // Leer el archivo SQL
    const migrationPath = path.join(__dirname, '../database/migrations/add_pedido_id_to_ventas.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Ejecutando migración: add_pedido_id_to_ventas.sql');
    
    // Ejecutar la migración
    await connection.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente');
    console.log('✅ Columna pedido_id agregada a la tabla ventas');

  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

runMigration();
