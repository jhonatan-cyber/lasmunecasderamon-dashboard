const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nuwesoft',
      port: parseInt(process.env.DB_PORT || '3306'),
      multipleStatements: true
    });

    console.log('✅ Conectado a la base de datos');
    
    const sqlPath = path.join(__dirname, '..', 'sql', 'migration_hostess_assignment.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔄 Ejecutando migración...');
    const [results] = await connection.query(sqlContent);
    
    console.log('✅ Migración ejecutada exitosamente');
    
    // Verificar que las columnas se crearon
    const [columns1] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'detalle_pedidos' 
      AND COLUMN_NAME = 'hostess_id'
      AND TABLE_SCHEMA = ?
    `, [process.env.DB_NAME]);
    
    const [columns2] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'detalle_ventas' 
      AND COLUMN_NAME = 'hostess_id'
      AND TABLE_SCHEMA = ?
    `, [process.env.DB_NAME]);
    
    if (columns1.length > 0) {
      console.log('✅ Columna hostess_id agregada a detalle_pedidos');
    } else {
      console.log('⚠️  No se pudo agregar columna hostess_id a detalle_pedidos');
    }
    
    if (columns2.length > 0) {
      console.log('✅ Columna hostess_id agregada a detalle_ventas');
    } else {
      console.log('⚠️  No se pudo agregar columna hostess_id a detalle_ventas');
    }
    
  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

runMigration();
