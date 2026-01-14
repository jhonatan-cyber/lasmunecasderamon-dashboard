const mysql = require('mysql2/promise');

async function checkUsersTable() {
  console.log('=== VERIFICAR ESTRUCTURA DE TABLA USUARIOS ===\n');
  
  const config = {
    host: '127.0.0.1',
    user: 'nuwesoft',
    password: '***REMOVED***',
    database: 'lasmunecasderamon',
    port: 3306
  };

  const connection = await mysql.createConnection(config);

  try {
    console.log('--- ESTRUCTURA DE usuarios ---');
    const [structure] = await connection.query('DESCRIBE usuarios');
    console.log('Columnas:');
    structure.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULLABLE'} ${col.Key === 'PRI' ? '[PRIMARY KEY]' : ''}`);
    });
    console.log();

    console.log('--- MUESTRA DE DATOS USUARIOS ---');
    const [sample] = await connection.query('SELECT * FROM usuarios LIMIT 3');
    console.log(JSON.stringify(sample, null, 2));
    console.log();

    console.log('--- ROLES DISPONIBLES ---');
    const [roles] = await connection.query('SELECT * FROM roles');
    console.log(JSON.stringify(roles, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsersTable().catch(console.error);
