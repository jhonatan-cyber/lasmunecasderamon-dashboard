#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function findAndUpdateAllCascades() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔍 Buscando TODAS las Foreign Keys sin ON DELETE CASCADE...\n');

    // Obtener todas las constraints
    const [constraints] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME IS NOT NULL 
      AND TABLE_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME != 'PRIMARY'
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `);

    if (constraints.length === 0) {
      console.log('✅ No hay constraints para actualizar');
      await connection.end();
      return;
    }

    console.log(`📊 Se encontraron ${constraints.length} constraints en total\n`);

    // Agrupar por tabla referenciada
    const grouped = {};
    constraints.forEach(c => {
      if (!grouped[c.REFERENCED_TABLE_NAME]) {
        grouped[c.REFERENCED_TABLE_NAME] = [];
      }
      grouped[c.REFERENCED_TABLE_NAME].push(c);
    });

    // Generar y ejecutar ALTER statements
    let sqlStatements = [];
    
    for (const [refTable, constraints] of Object.entries(grouped)) {
      console.log(`\n📌 Tabla referenciada: ${refTable}`);
      console.log(`   Constraints a actualizar: ${constraints.length}\n`);

      for (const c of constraints) {
        // DROP
        sqlStatements.push(`ALTER TABLE ${c.TABLE_NAME} DROP FOREIGN KEY IF EXISTS ${c.CONSTRAINT_NAME};`);
        
        // ADD con CASCADE
        sqlStatements.push(
          `ALTER TABLE ${c.TABLE_NAME} ADD CONSTRAINT ${c.CONSTRAINT_NAME} ` +
          `FOREIGN KEY (${c.COLUMN_NAME}) REFERENCES ${c.REFERENCED_TABLE_NAME}(${c.REFERENCED_COLUMN_NAME}) ` +
          `ON DELETE CASCADE ON UPDATE CASCADE;`
        );

        console.log(`   ✓ ${c.TABLE_NAME}.${c.COLUMN_NAME} -> ${c.REFERENCED_TABLE_NAME}(${c.REFERENCED_COLUMN_NAME})`);
      }
    }

    // Ejecutar todos los statements
    console.log('\n⏳ Ejecutando updates...\n');
    for (const statement of sqlStatements) {
      await connection.query(statement);
    }

    console.log('✅ Todas las Foreign Keys han sido actualizadas con ON DELETE CASCADE');
    console.log('✅ Ahora puedes eliminar registros sin problemas de restricción');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await connection.end();
    process.exit(1);
  }
}

findAndUpdateAllCascades();
