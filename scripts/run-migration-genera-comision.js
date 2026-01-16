const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../database/migrations/add_genera_comision_to_detalle_pedidos.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Dividir por líneas y filtrar comentarios
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`\n📝 Ejecutando ${statements.length} sentencias SQL...\n`);

    // Ejecutar cada sentencia
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await connection.execute(statement);
          console.log(`✅ Sentencia ${i + 1}/${statements.length} ejecutada correctamente`);
        } catch (error) {
          // Si el error es que la columna ya existe, lo ignoramos
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`⚠️  Sentencia ${i + 1}/${statements.length} - La columna ya existe, omitiendo...`);
          } else {
            throw error;
          }
        }
      }
    }

    // Verificar que la columna se agregó correctamente
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM detalle_pedidos WHERE Field = 'genera_comision'"
    );

    if (columns.length > 0) {
      console.log('\n✅ Migración completada exitosamente!');
      console.log('\n📊 Información de la columna:');
      console.log(columns[0]);
      
      // Verificar registros existentes
      const [count] = await connection.execute(
        'SELECT COUNT(*) as total FROM detalle_pedidos'
      );
      console.log(`\n📦 Total de registros en detalle_pedidos: ${count[0].total}`);
      
      if (count[0].total > 0) {
        const [withComision] = await connection.execute(
          'SELECT COUNT(*) as total FROM detalle_pedidos WHERE genera_comision = 1'
        );
        console.log(`✅ Registros con comisión (genera_comision=1): ${withComision[0].total}`);
      }
    } else {
      console.log('\n❌ Error: La columna no se agregó correctamente');
    }

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
