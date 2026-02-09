const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function addIndexes() {
  let connection;
  
  try {
    // Leer configuración de base de datos desde .env
    require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
    
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lasmunecasderamon',
      multipleStatements: true
    };

    console.log('🔌 Conectando a la base de datos...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Database: ${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida\n');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '../database/migrations/add-performance-indexes.sql');
    console.log('📄 Leyendo archivo de migración...');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Dividir por comandos individuales (separados por ;)
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📊 Ejecutando ${commands.length} comandos...\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Extraer nombre del índice del comando
      const indexMatch = command.match(/idx_\w+/);
      const indexName = indexMatch ? indexMatch[0] : `comando ${i + 1}`;
      
      try {
        await connection.execute(command);
        console.log(`✅ [${i + 1}/${commands.length}] ${indexName}`);
        successCount++;
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`⏭️  [${i + 1}/${commands.length}] ${indexName} (ya existe)`);
          skipCount++;
        } else {
          console.error(`❌ [${i + 1}/${commands.length}] ${indexName}`);
          console.error(`   Error: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE EJECUCIÓN');
    console.log('='.repeat(50));
    console.log(`✅ Índices creados: ${successCount}`);
    console.log(`⏭️  Índices existentes: ${skipCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📝 Total comandos: ${commands.length}`);
    console.log('='.repeat(50));

    if (errorCount === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
      console.log('\n💡 Recomendaciones:');
      console.log('   1. Verificar índices: SHOW INDEX FROM <tabla>;');
      console.log('   2. Analizar queries: EXPLAIN SELECT ...;');
      console.log('   3. Monitorear performance en producción');
    } else {
      console.log('\n⚠️  Migración completada con errores');
      console.log('   Revisar los errores arriba y corregir si es necesario');
    }

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar
console.log('🚀 Iniciando migración de índices de performance...\n');
addIndexes();
