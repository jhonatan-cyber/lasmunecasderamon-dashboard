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
      multipleStatements: true
    });

    console.log('✅ Conexión establecida');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'add_caja_id_to_ventas_servicios.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Ejecutando migración: add_caja_id_to_ventas_servicios.sql');
    console.log('📝 Agregando campo caja_id a ventas y servicios...');

    // Ejecutar la migración
    await connection.query(migrationSQL);

    console.log('✅ Migración completada exitosamente');
    console.log('');
    console.log('📊 Resumen de cambios:');
    console.log('  - Campo caja_id agregado a tabla ventas');
    console.log('  - Campo caja_id agregado a tabla servicios');
    console.log('  - Índices creados para mejorar el rendimiento');
    console.log('  - Foreign keys configuradas');
    console.log('  - Datos existentes actualizados con caja_id correspondiente');
    console.log('');

    // Verificar cuántos registros se actualizaron
    const [ventasResult] = await connection.query(
      'SELECT COUNT(*) as total, COUNT(caja_id) as con_caja FROM ventas'
    );
    const [serviciosResult] = await connection.query(
      'SELECT COUNT(*) as total, COUNT(caja_id) as con_caja FROM servicios'
    );

    console.log('📈 Estadísticas:');
    console.log(`  - Ventas: ${ventasResult[0].con_caja}/${ventasResult[0].total} con caja_id asignado`);
    console.log(`  - Servicios: ${serviciosResult[0].con_caja}/${serviciosResult[0].total} con caja_id asignado`);

  } catch (error) {
    console.error('❌ Error ejecutando la migración:', error.message);
    console.error('');
    console.error('Detalles del error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('');
      console.log('🔌 Conexión cerrada');
    }
  }
}

runMigration();
