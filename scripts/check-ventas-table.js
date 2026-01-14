#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkVentasTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔍 Verificando estructura de tabla ventas...\n');

    const [columns] = await connection.query('DESCRIBE ventas');
    
    console.log('Columnas encontradas:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // Verificar columnas críticas
    const columnNames = columns.map(c => c.Field);
    const requiredColumns = ['sub_total', 'total_comision', 'codigo', 'cliente_id', 'habitacion_id', 'metodo_pago', 'propina', 'total'];
    
    console.log('\n📊 Verificando columnas requeridas:\n');
    requiredColumns.forEach(col => {
      if (columnNames.includes(col)) {
        console.log(`  ✅ ${col}`);
      } else {
        console.log(`  ❌ ${col} - FALTA`);
      }
    });

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await connection.end();
    process.exit(1);
  }
}

checkVentasTable();
