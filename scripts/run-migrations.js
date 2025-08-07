const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admin_dashboard',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true
};

async function runMigrations() {
  let connection;
  
  try {
    console.log('🔗 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión exitosa');

    // Leer archivos de migración
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ejecutar en orden alfabético

    console.log(`📁 Encontradas ${migrationFiles.length} migraciones`);

    for (const file of migrationFiles) {
      console.log(`\n🔄 Ejecutando migración: ${file}`);
      
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await connection.query(migrationSQL);
        console.log(`✅ Migración ${file} ejecutada exitosamente`);
      } catch (error) {
        console.error(`❌ Error ejecutando migración ${file}:`, error.message);
        // Continuar con las siguientes migraciones
      }
    }

    console.log('\n🎉 Todas las migraciones han sido ejecutadas');
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar migraciones si el script se ejecuta directamente
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations }; 