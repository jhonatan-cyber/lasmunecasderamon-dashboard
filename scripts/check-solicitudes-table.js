const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno manualmente
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

async function checkAndCreateTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('✓ Conectado a la base de datos');

    // Verificar si la tabla existe
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'solicitudes_servicios'"
    );

    if (tables.length === 0) {
      console.log('✗ La tabla solicitudes_servicios NO existe');
      console.log('→ Ejecutando migración...');

      // Leer el archivo SQL
      const sqlPath = path.join(__dirname, '../database/migrations/create_solicitudes_servicios.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      // Ejecutar la migración
      await connection.query(sql);
      console.log('✓ Tabla solicitudes_servicios creada exitosamente');
    } else {
      console.log('✓ La tabla solicitudes_servicios ya existe');
      
      // Verificar estructura
      const [columns] = await connection.query(
        "DESCRIBE solicitudes_servicios"
      );
      
      console.log('\nColumnas de la tabla:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAndCreateTable();
