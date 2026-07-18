/**
 * Script para ejecutar la migración add_force_password_change.sql
 * Usa mysql2 (ya instalado en el proyecto) que soporta caching_sha2_password.
 *
 * Uso: node scripts/run-force-password-migration.mjs
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
config({ path: envPath });

const migrationPath = resolve(__dirname, '..', 'migrations', 'add_force_password_change.sql');
const migrationSql = readFileSync(migrationPath, 'utf8');

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: true
});

try {
  console.log('✅ Conectado a la base de datos');
  
  const statements = migrationSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (const stmt of statements) {
    const sql = stmt + ';';
    console.log(`▶ Ejecutando: ${sql.substring(0, 80)}...`);
    await connection.execute(sql);
    console.log('  ✅ OK');
  }

  console.log('\n✅ Migración completada exitosamente');
} catch (err) {
  if (err.code === 'ER_DUP_FIELDNAME') {
    console.log('⚠️ La columna force_password_change ya existe. Migración ya aplicada.');
  } else {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
} finally {
  await connection.end();
}
