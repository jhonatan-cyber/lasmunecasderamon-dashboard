#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function findAllForeignKeys() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔍 Buscando todas las Foreign Keys que referencian a usuarios...\n');

    // Buscar todas las constraints que referencian a la tabla usuarios
    const [rows] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME = 'usuarios' 
      AND CONSTRAINT_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    if (rows.length === 0) {
      console.log('❌ No se encontraron constraints');
      await connection.end();
      return;
    }

    console.log(`✅ Se encontraron ${rows.length} constraints:\n`);
    
    // Agrupar por tabla
    const tableConstraints = {};
    rows.forEach(row => {
      if (!tableConstraints[row.TABLE_NAME]) {
        tableConstraints[row.TABLE_NAME] = [];
      }
      tableConstraints[row.TABLE_NAME].push(row);
    });

    // Mostrar todas
    Object.entries(tableConstraints).forEach(([table, constraints]) => {
      constraints.forEach(c => {
        console.log(`📌 Tabla: ${c.TABLE_NAME}`);
        console.log(`   Constraint: ${c.CONSTRAINT_NAME}`);
        console.log(`   Columna: ${c.COLUMN_NAME}`);
        console.log(`   Referencia: ${c.REFERENCED_TABLE_NAME}(${c.REFERENCED_COLUMN_NAME})\n`);
      });
    });

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await connection.end();
    process.exit(1);
  }
}

findAllForeignKeys();
