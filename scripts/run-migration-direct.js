const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  
  try {
    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nuwesoft',
      port: process.env.DB_PORT || 3306,
    });

    console.log('✅ Conectado a la base de datos');

    // Verificar si la columna ya existe
    const [existingColumns] = await connection.execute(
      "SHOW COLUMNS FROM detalle_pedidos WHERE Field = 'genera_comision'"
    );

    if (existingColumns.length > 0) {
      console.log('\n⚠️  La columna genera_comision ya existe en la tabla detalle_pedidos');
      console.log('📊 Información de la columna:');
      console.log(existingColumns[0]);
    } else {
      console.log('\n📝 Agregando columna genera_comision...');
      
      // Agregar la columna
      await connection.execute(`
        ALTER TABLE detalle_pedidos 
        ADD COLUMN genera_comision TINYINT(1) NOT NULL DEFAULT 1 
        COMMENT 'Indica si el producto genera comisión para las anfitrionas (1=Sí, 0=No)' 
        AFTER comision
      `);
      
      console.log('✅ Columna agregada exitosamente');
      
      // Actualizar registros existentes
      await connection.execute(
        'UPDATE detalle_pedidos SET genera_comision = 1 WHERE genera_comision IS NULL'
      );
      
      console.log('✅ Registros existentes actualizados');
    }

    // Verificar registros
    const [count] = await connection.execute(
      'SELECT COUNT(*) as total FROM detalle_pedidos'
    );
    console.log(`\n📦 Total de registros en detalle_pedidos: ${count[0].total}`);
    
    if (count[0].total > 0) {
      const [withComision] = await connection.execute(
        'SELECT COUNT(*) as total FROM detalle_pedidos WHERE genera_comision = 1'
      );
      const [withoutComision] = await connection.execute(
        'SELECT COUNT(*) as total FROM detalle_pedidos WHERE genera_comision = 0'
      );
      console.log(`✅ Registros con comisión (genera_comision=1): ${withComision[0].total}`);
      console.log(`❌ Registros sin comisión (genera_comision=0): ${withoutComision[0].total}`);
    }

    console.log('\n✅ Migración completada exitosamente!');

  } catch (error) {
    console.error('\n❌ Error al ejecutar la migración:');
    console.error(error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la migración
runMigration();
