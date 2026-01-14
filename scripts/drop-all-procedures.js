#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function dropAllProcedures() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔍 Obteniendo todos los procedures restantes...\n');

    const [procedures] = await connection.query(`
      SELECT ROUTINE_NAME 
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = DATABASE() 
      AND ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_NAME
    `);

    if (procedures.length === 0) {
      console.log('✅ No hay procedures en la base de datos');
      await connection.end();
      return;
    }

    console.log(`📊 Se encontraron ${procedures.length} procedures:\n`);
    procedures.forEach((p, i) => {
      console.log(`${i + 1}. ${p.ROUTINE_NAME}`);
    });

    console.log('\n⏳ Eliminando todos los procedures...\n');

    for (const proc of procedures) {
      try {
        await connection.query(`DROP PROCEDURE IF EXISTS ${proc.ROUTINE_NAME}`);
        console.log(`✅ ${proc.ROUTINE_NAME}`);
      } catch (error) {
        console.error(`❌ ${proc.ROUTINE_NAME}: ${error.message}`);
      }
    }

    console.log('\n✅ Todos los procedures han sido eliminados');
    console.log(`📊 Total eliminado: ${procedures.length}`);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    await connection.end();
    process.exit(1);
  }
}

dropAllProcedures();
