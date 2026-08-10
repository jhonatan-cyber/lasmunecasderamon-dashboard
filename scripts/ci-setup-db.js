/* eslint-disable no-console */
/**
 * ci-setup-db.js — Prepara la BD para la suite de integración en CI.
 *
 * Conecta al MySQL/MariaDB provisto por el service container, crea la BD si no
 * existe e importa database/lasmunecasderamon.sql si está vacía. Replica el
 * comportamiento de db-dev.js (ensureDatabase) sin descargar un MariaDB
 * portable, pensado para el job de integración del CI.
 *
 * Variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'lasmunecasderamon';
const SCHEMA_FILE = path.resolve(__dirname, '..', 'database', 'lasmunecasderamon.sql');

async function main() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
    connectTimeout: 5000
  });

  try {
    console.log(`🗄️  Asegurando base de datos '${DB_NAME}' en ${DB_HOST}:${DB_PORT}...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${DB_NAME}\``);

    const [tables] = await connection.query(
      `SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ?`,
      [DB_NAME]
    );
    const tableCount = Number(tables[0]?.c || 0);
    if (tableCount > 0) {
      console.log(`✅ La BD ya tiene ${tableCount} tablas. Schema intacto.`);
      return;
    }

    if (!fs.existsSync(SCHEMA_FILE)) {
      throw new Error(`No se encontró el schema en ${SCHEMA_FILE}`);
    }
    console.log(`📥 Importando ${path.relative(process.cwd(), SCHEMA_FILE)}...`);
    const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
    await connection.query(schema);
    console.log('✅ Schema importado correctamente.');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('❌ Error en ci-setup-db.js:', error.message);
  process.exit(1);
});
