#!/usr/bin/env node
/**
 * Purge Query Logs
 *
 * Elimina registros antiguos de la tabla query_logs.
 * Diseñado para ejecutarse como cron job diario.
 *
 * Uso:
 *   node scripts/purge-query-logs.js                    # purga >7 días (default)
 *   node scripts/purge-query-logs.js --days=30          # purga >30 días
 *   node scripts/purge-query-logs.js --dry-run          # solo muestra cuántos eliminaría
 *   node scripts/purge-query-logs.js --quiet            # solo output si hay error
 *   node scripts/purge-query-logs.js --min-age=1        # purga >1 día (testing)
 *
 * Cron daily:
 *   0 3 * * * cd /path/to/project && node scripts/purge-query-logs.js --quiet >> /dev/null 2>&1
 */

const mysql = require('mysql2/promise');

// Cargar dotenv manualmente si está disponible
try {
  require('dotenv/config');
} catch {
  // dotenv no instalado, usar process.env directamente
}

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.replace(/^--/, '').split('=');
  acc[key] = val !== undefined ? val : true;
  return acc;
}, {});

const DAYS = parseInt(args.days, 10) || parseInt(args['min-age'], 10) || 7;
const DRY_RUN = !!args['dry-run'];
const QUIET = !!args.quiet;

function log(...msg) {
  if (!QUIET) console.log(...msg);
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    timezone: '-04:00',
    dateStrings: true,
    connectTimeout: 10000,
  });

  try {
    // Verificar que la tabla existe
    const [tables] = await connection.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'query_logs'",
      [process.env.DB_NAME || 'lasmunecasderamon']
    );
    if (!tables[0]?.cnt) {
      log('⚠️  Tabla query_logs no existe en la BD. Nada que purgar.');
      return;
    }

    if (DRY_RUN) {
      // Dry-run: contar cuántos se eliminarían
      const [rows] = await connection.query(
        'SELECT COUNT(*) as cnt FROM query_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [DAYS]
      );
      const count = rows[0]?.cnt || 0;
      log(`[purge-query-logs] 📊 Dry-run: ${count} registro(s) serían eliminados (>${DAYS} días)`);
      return;
    }

    // Purga real
    const [result] = await connection.query(
      'DELETE FROM query_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [DAYS]
    );

    const deleted = result?.affectedRows || 0;
    log(`[purge-query-logs] ✅ ${deleted} registro(s) eliminados (>${DAYS} días)`);

    // Mostrar resumen post-purga
    const [remaining] = await connection.query('SELECT COUNT(*) as cnt FROM query_logs');
    log(`[purge-query-logs] 📊 ${remaining[0]?.cnt || 0} registro(s) restantes en query_logs`);

  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error(`[purge-query-logs] ❌ Error:`, err.message);
  process.exit(1);
});
