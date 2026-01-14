const mysql = require('mysql2/promise');

async function checkTableStructure() {
  console.log('=== VERIFICAR ESTRUCTURA DE TABLA ===\n');
  
  const config = {
    host: '127.0.0.1',
    user: 'nuwesoft',
    password: 'Ancasi96nuwe',
    database: 'lasmunecasderamon',
    port: 3306
  };

  const connection = await mysql.createConnection(config);

  try {
    console.log('--- ESTRUCTURA DE detalle_ventas ---');
    const [structure] = await connection.query('DESCRIBE detalle_ventas');
    console.log('Columnas:');
    structure.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
    });
    console.log();

    console.log('--- MUESTRA DE DATOS detalle_ventas ---');
    const [sample] = await connection.query('SELECT * FROM detalle_ventas LIMIT 3');
    console.log(JSON.stringify(sample, null, 2));
    console.log();

    console.log('--- ESTRUCTURA DE ventas ---');
    const [ventasStructure] = await connection.query('DESCRIBE ventas');
    console.log('Columnas:');
    ventasStructure.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkTableStructure().catch(console.error);
