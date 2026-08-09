/**
 * guard-local-db.js — Guarda de seguridad para los tests de integración.
 *
 * Aborta el proceso si el DB_HOST efectivo (variable de entorno o .env) no es
 * una dirección loopback, para que los tests de integración NUNCA apunten a la
 * BD remota/producción por accidente (los tests escriben y borran datos).
 *
 * Opt-out explícito para correr contra un staging a propósito:
 *     DB_ALLOW_REMOTE=1
 *
 * Uso:
 *     require('./guard-local-db')();               // scripts/
 *     require('../../scripts/guard-local-db')();   // tests/integration/legacy-db/
 *     require('../scripts/guard-local-db')();      // tests/integration/
 */

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function isLoopback(host) {
  return LOOPBACK_HOSTS.has(
    String(host || '')
      .toLowerCase()
      .trim()
  );
}

/**
 * @param {{ env?: NodeJS.ProcessEnv, loadDotenv?: boolean }} [options]
 *   env:        entorno a validar (default: process.env)
 *   loadDotenv: cargar .env antes de resolver DB_HOST (default: true).
 *               Los runners (run-integration-all / run-legacy-db-tests) pasan
 *               false porque gestionan su propia resolución y NO deben
 *               consultar el .env (que apunta a la BD remota).
 */
function assertLocalDb({ env = process.env, loadDotenv = true } = {}) {
  if (loadDotenv) {
    require('dotenv').config();
  }

  const allowRemote = env.DB_ALLOW_REMOTE === '1' || env.DB_ALLOW_REMOTE === 'true';
  const host = String(env.DB_HOST || '127.0.0.1')
    .toLowerCase()
    .trim();

  if (allowRemote) {
    console.warn(`⚠️  DB_ALLOW_REMOTE=1 detectado — permitiendo BD remota: ${host}`);
    return;
  }
  if (isLoopback(host)) {
    return;
  }

  console.error('');
  console.error('⛔ GUARDA DE SEGURIDAD: DB_HOST apunta a una BD remota.');
  console.error(`   DB_HOST=${env.DB_HOST}`);
  console.error('   Los tests de integración solo pueden correr contra una BD local');
  console.error(
    '   (127.0.0.1, localhost o ::1). Si es intencional (staging), usa DB_ALLOW_REMOTE=1.'
  );
  console.error('');
  process.exit(1);
}

module.exports = assertLocalDb;
