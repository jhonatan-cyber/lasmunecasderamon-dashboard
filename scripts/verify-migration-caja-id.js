const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function verifyMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nuwesoft'
    });

    console.log('✅ Verificando migración...\n');

    // Verificar índices en ventas
    console.log('📊 Índices en tabla ventas:');
    const [idxVentas] = await connection.query(
      'SHOW INDEX FROM ventas WHERE Key_name = "idx_ventas_caja_id"'
    );
    if (idxVentas.length > 0) {
      console.log('  ✅ idx_ventas_caja_id creado correctamente');
    } else {
      console.log('  ❌ idx_ventas_caja_id NO encontrado');
    }

    // Verificar índices en servicios
    console.log('\n📊 Índices en tabla servicios:');
    const [idxServicios] = await connection.query(
      'SHOW INDEX FROM servicios WHERE Key_name = "idx_servicios_caja_id"'
    );
    if (idxServicios.length > 0) {
      console.log('  ✅ idx_servicios_caja_id creado correctamente');
    } else {
      console.log('  ❌ idx_servicios_caja_id NO encontrado');
    }

    // Verificar foreign keys
    console.log('\n🔗 Foreign Keys:');
    const [fkVentas] = await connection.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND CONSTRAINT_NAME = 'fk_ventas_caja'
    `, [process.env.DB_NAME]);
    
    if (fkVentas.length > 0) {
      console.log('  ✅ fk_ventas_caja creado correctamente');
    } else {
      console.log('  ❌ fk_ventas_caja NO encontrado');
    }

    const [fkServicios] = await connection.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND CONSTRAINT_NAME = 'fk_servicios_caja'
    `, [process.env.DB_NAME]);
    
    if (fkServicios.length > 0) {
      console.log('  ✅ fk_servicios_caja creado correctamente');
    } else {
      console.log('  ❌ fk_servicios_caja NO encontrado');
    }

    console.log('\n✅ Verificación completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la verificación:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyMigration();
