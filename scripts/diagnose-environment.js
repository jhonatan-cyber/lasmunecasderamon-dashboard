#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function compareEnvironments() {
  console.log('🔍 Comparando estructura entre entornos...\n');

  // Conexión local
  const localConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    // Verificar tablas críticas
    const tables = ['ventas', 'detalle_ventas', 'ventas_usuarios', 'comisiones', 'detalle_comisiones', 'cajas'];
    
    for (const table of tables) {
      console.log(`\n📋 Tabla: ${table}`);
      
      try {
        const [columns] = await localConn.query(`DESCRIBE ${table}`);
        console.log(`  ✅ Existe con ${columns.length} columnas`);
        
        // Mostrar columnas
        columns.forEach(col => {
          console.log(`    - ${col.Field} (${col.Type})`);
        });
      } catch (error) {
        console.log(`  ❌ No existe o error: ${error.message}`);
      }
    }

    // Verificar stored procedures
    console.log('\n\n🔧 Verificando stored procedures...');
    const [procedures] = await localConn.query(`
      SELECT ROUTINE_NAME 
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = DATABASE() 
      AND ROUTINE_TYPE = 'PROCEDURE'
    `);
    
    if (procedures.length === 0) {
      console.log('  ✅ No hay stored procedures (correcto)');
    } else {
      console.log(`  ⚠️  Se encontraron ${procedures.length} procedures:`);
      procedures.forEach(p => console.log(`    - ${p.ROUTINE_NAME}`));
    }

    // Verificar datos de prueba
    console.log('\n\n📊 Verificando datos básicos...');
    
    const [clientsCount] = await localConn.query('SELECT COUNT(*) as count FROM clientes');
    console.log(`  Clientes: ${clientsCount[0].count}`);
    
    const [productsCount] = await localConn.query('SELECT COUNT(*) as count FROM productos');
    console.log(`  Productos: ${productsCount[0].count}`);
    
    const [usersCount] = await localConn.query('SELECT COUNT(*) as count FROM usuarios');
    console.log(`  Usuarios: ${usersCount[0].count}`);
    
    const [cajaAbierta] = await localConn.query('SELECT COUNT(*) as count FROM cajas WHERE estado = 1');
    console.log(`  Cajas abiertas: ${cajaAbierta[0].count}`);

    await localConn.end();
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await localConn.end();
    process.exit(1);
  }
}

compareEnvironments();
