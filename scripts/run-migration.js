const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true // Allow multiple SQL statements in one query
};

async function runMigrations() {
  let connection;
  try {
    console.log('🚀 Iniciando migraciones...');
    connection = await mysql.createConnection(dbConfig);

    // 1. Verificar si la base de datos está vacía (chequeando por ejemplo la tabla 'usuarios')
    const [existingTables] = await connection.query("SHOW TABLES LIKE 'usuarios'");
    
    if (existingTables.length === 0) {
      console.log('📦 Base de datos vacía detectada. Realizando importación inicial...');
      const baseSqlPath = path.join(__dirname, '../database/lasmunecasderamon.sql');
      
      if (fs.existsSync(baseSqlPath)) {
        const baseSql = fs.readFileSync(baseSqlPath, 'utf8');
        // Separamos por bloques si es necesario o usamos multipleStatements: true
        await connection.query(baseSql);
        console.log('✅ Importación inicial completada desde lasmunecasderamon.sql');
      } else {
        console.warn('⚠️ No se encontró el archivo base database/lasmunecasderamon.sql');
      }
    }

    // 2. Crear tabla de migraciones si no existe (importante después de la importación inicial)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Leer archivos de la carpeta migrations
    const migrationsDir = path.join(__dirname, '../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️ Carpeta de migraciones no encontrada.');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('✅ No hay archivos de migración pendientes.');
      return;
    }

    // 4. Ejecutar migraciones adicionales de la carpeta /migrations
    for (const file of files) {
      const [rows] = await connection.query('SELECT id FROM _migrations WHERE filename = ?', [file]);
      
      if (rows.length === 0) {
        console.log(`⏳ Ejecutando migración: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        try {
          await connection.query(sql);
          await connection.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
          console.log(`✅ Migración ${file} completada.`);
        } catch (err) {
          // Si el error es una columna que ya existe, lo ignoramos amigablemente
          if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME') {
            console.log(`⏭️ Migración ${file} ya parecía aplicada (Error de duplicado controlado). Marcando como hecha.`);
            await connection.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
          } else {
            console.error(`❌ Error en migración ${file}:`, err.message);
            throw err;
          }
        }
      } else {
        console.log(`⏭️ Saltando migración ya ejecutada: ${file}`);
      }
    }

    console.log('🏁 Proceso de migración finalizado exitosamente.');

  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigrations();
