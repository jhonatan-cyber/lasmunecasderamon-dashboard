#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function dropUnusedProcedures() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    const keepProcedures = [
      'add_client',
      'delete_client',
      'get_all_client',
      'get_client_by_id',
      'update_client',
      'get_all_order'
    ];

    console.log('🔍 Obteniendo lista de procedures...\n');

    const [procedures] = await connection.query(`
      SELECT ROUTINE_NAME 
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = DATABASE() 
      AND ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_NAME
    `);

    const toDrop = procedures
      .map(p => p.ROUTINE_NAME)
      .filter(name => !keepProcedures.includes(name));

    if (toDrop.length === 0) {
      console.log('✅ No hay procedures para eliminar');
      await connection.end();
      return;
    }

    console.log(`📊 Se eliminarán ${toDrop.length} procedures no usados:\n`);
    toDrop.forEach((name, i) => {
      console.log(`${i + 1}. ${name}`);
    });

    console.log('\n⏳ Eliminando procedures...\n');

    for (const procName of toDrop) {
      try {
        await connection.query(`DROP PROCEDURE IF EXISTS ${procName}`);
        console.log(`✅ ${procName}`);
      } catch (error) {
        console.error(`❌ ${procName}: ${error.message}`);
      }
    }

    console.log('\n✅ Procedure cleanup completado');
    console.log(`\n📊 Resumen:`);
    console.log(`   Procedures eliminados: ${toDrop.length}`);
    console.log(`   Procedures preservados: ${keepProcedures.length}`);
    console.log(`   Total anterior: ${procedures.length}`);
    console.log(`   Total nuevo: ${keepProcedures.length}`);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    await connection.end();
    process.exit(1);
  }
}

dropUnusedProcedures();
