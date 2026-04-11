/* eslint-disable no-console */
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
    console.log('ðŸš€ Iniciando migraciones...');
    connection = await mysql.createConnection(dbConfig);

    // 1. Verificar si la base de datos estÃ¡ vacÃ­a (chequeando por ejemplo la tabla 'usuarios')
    const [existingTables] = await connection.query("SHOW TABLES LIKE 'usuarios'");

    if (existingTables.length === 0) {
      console.log('ðŸ“¦ Base de datos vacÃ­a detectada. Realizando importaciÃ³n inicial...');
      const baseSqlPath = path.join(__dirname, '../database/lasmunecasderamon.sql');

      if (fs.existsSync(baseSqlPath)) {
        const baseSql = fs.readFileSync(baseSqlPath, 'utf8');
        // Separamos por bloques si es necesario o usamos multipleStatements: true
        await connection.query(baseSql);
        console.log('âœ… ImportaciÃ³n inicial completada desde lasmunecasderamon.sql');
      } else {
        console.warn('âš ï¸ No se encontrÃ³ el archivo base database/lasmunecasderamon.sql');
      }
    }

    // 2. Crear tabla de migraciones si no existe (importante despuÃ©s de la importaciÃ³n inicial)
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
      console.log('âš ï¸ Carpeta de migraciones no encontrada.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('âœ… No hay archivos de migraciÃ³n pendientes.');
      return;
    }

    // 4. Ejecutar migraciones adicionales de la carpeta /migrations
    for (const file of files) {
      const [rows] = await connection.query('SELECT id FROM _migrations WHERE filename = ?', [
        file
      ]);

      if (rows.length === 0) {
        console.log(`â³ Ejecutando migraciÃ³n: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        try {
          await connection.query(sql);
          await connection.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
          console.log(`âœ… MigraciÃ³n ${file} completada.`);
        } catch (err) {
          console.log(
            `DEBUG: Error en migraciÃ³n ${file}. Code: ${err.code}, ErrNo: ${err.errno}, Message: ${err.message}`
          );

          // Si el error es una columna que ya existe, lo ignoramos amigablemente
          const isDuplicateError =
            err.code === 'ER_DUP_FIELDNAME' ||
            err.code === 'ER_TABLE_EXISTS_ERROR' ||
            err.code === 'ER_DUP_KEYNAME' ||
            err.code === 'ER_FK_DUP_NAME' ||
            err.code === 'ER_CANT_CREATE_TABLE' || // Agregado para MySQL errno 121
            err.errno === 121 ||
            err.errno === 1022 ||
            err.message.includes('Duplicate field name') ||
            err.message.includes('Duplicate key on write or update') ||
            err.message.includes('already exists');

          if (isDuplicateError) {
            console.log(
              `â­ï¸ MigraciÃ³n ${file} ya parecÃ­a aplicada (Error de duplicado controlado: ${err.code || err.errno}). Marcando como hecha.`
            );
            await connection.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
          } else {
            console.error(`âŒ Error en migraciÃ³n ${file}:`, err.message);
            throw err;
          }
        }
      } else {
        console.log(`â­ï¸ Saltando migraciÃ³n ya ejecutada: ${file}`);
      }
    }

    console.log('ðŸ Proceso de migraciÃ³n finalizado exitosamente.');
  } catch (error) {
    console.error('âŒ Error fatal durante la migraciÃ³n:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigrations();
