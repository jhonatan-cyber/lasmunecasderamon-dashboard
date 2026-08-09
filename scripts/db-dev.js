#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Levanta una base de datos MariaDB portable de desarrollo para correr los
 * tests de integración (legacy-db + flujos) sin depender de la BD remota.
 *
 * Uso:  node scripts/db-dev.js        (o: npm run db:dev)
 *
 * Variables de entorno opcionales:
 *   DB_HOST, DB_PORT (default 3306), DB_USER (default root),
 *   DB_PASSWORD (default vacío), DB_NAME (default lasmunecasderamon)
 *
 * Comportamiento:
 *   1. Descarga MariaDB portable (Windows/Linux) a .dev/mariadb si falta.
 *   2. Inicializa el datadir en .dev/mariadb-data si falta.
 *   3. Arranca mysqld en background con el sql_mode laxo que requieren
 *      los tests legacy-db (MariaDB strict rompe comparaciones varchar <> 0
 *      y columnas NOT NULL sin default que MySQL 8.4 de producción tolera).
 *   4. Crea la BD e importa database/lasmunecasderamon.sql si está vacía.
 *
 * Es idempotente: si el servidor ya está arriba, no lo reinicia.
 */
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEV_DIR = path.join(ROOT, '.dev');
const MARIADB_DIR = path.join(DEV_DIR, 'mariadb');
const DATA_DIR = path.join(DEV_DIR, 'mariadb-data');
const LOG_FILE = path.join(DEV_DIR, 'mariadb-server.log');
const SCHEMA_FILE = path.join(ROOT, 'database', 'lasmunecasderamon.sql');

const MARIA_VERSION = '11.4.4';
const DOWNLOAD_DIR = path.join(DEV_DIR, 'downloads');
const DOWNLOAD_FILE = path.join(DOWNLOAD_DIR, 'mariadb.bin');

// sql_mode laxo: sin STRICT_TRANS_TABLES (ver comentario arriba)
const SQL_MODE = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'lasmunecasderamon';

const PLATFORM = process.platform;
const isWindows = PLATFORM === 'win32';
const isLinux = PLATFORM === 'linux';
const exe = isWindows ? '.exe' : '';

function bin(name) {
  return path.join(MARIADB_DIR, 'bin', name + exe);
}

function mysqlArgs(extra = []) {
  const args = ['-h', DB_HOST, '-u', DB_USER];
  if (DB_PASSWORD) args.push(`--password=${DB_PASSWORD}`);
  return args.concat(extra);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
  if (res.error) throw res.error;
  return res;
}

function log(msg) {
  console.log(msg);
}

// ---------------------------------------------------------------- descarga

function downloadUrl() {
  if (isWindows) {
    return `https://archive.mariadb.org/mariadb-${MARIA_VERSION}/winx64-packages/mariadb-${MARIA_VERSION}-winx64.zip`;
  }
  if (isLinux) {
    return `https://archive.mariadb.org/mariadb-${MARIA_VERSION}/bintar-linux-systemd-x86_64/mariadb-${MARIA_VERSION}-linux-systemd-x86_64.tar.gz`;
  }
  return null;
}

async function download(url, dest) {
  log(`⬇️  Descargando MariaDB ${MARIA_VERSION} (~90 MB)...`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`No se pudo descargar MariaDB: HTTP ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  log(`   Descargado (${(buffer.length / 1024 / 1024).toFixed(1)} MB).`);
}

function extract(dest) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  // unzip existe en Git Bash; bsdtar (tar -xf) maneja zip en Windows 10+ / macOS
  if (isWindows) {
    const unzip = run('unzip', ['-q', '-o', dest, '-d', DOWNLOAD_DIR], { stdio: 'ignore' });
    if (unzip.status !== 0) {
      run('tar', ['-xf', dest, '-C', DOWNLOAD_DIR], { stdio: 'ignore' });
    }
  } else {
    run('tar', ['-xf', dest, '-C', DOWNLOAD_DIR], { stdio: 'ignore' });
  }
}

async function ensureMariaDB() {
  if (fs.existsSync(bin('mysqld'))) {
    log(`✅ MariaDB portable ya existe en ${MARIADB_DIR}`);
    return;
  }

  const url = downloadUrl();
  if (!url) {
    // macOS u otro SO: usar el MariaDB/MySQL del sistema
    for (const candidate of ['mariadbd', 'mysqld']) {
      const which = run('bash', ['-lc', `command -v ${candidate}`], { stdio: 'pipe' });
      if (which.status === 0 && which.stdout.trim()) {
        log(`ℹ️  Usando ${candidate} del sistema (${which.stdout.trim()}).`);
        fs.mkdirSync(MARIADB_DIR, { recursive: true });
        fs.writeFileSync(path.join(MARIADB_DIR, 'bin-marker.txt'), `system:${candidate}\n`);
        return;
      }
    }
    throw new Error(
      `No hay MariaDB portable para este SO (${PLATFORM}). Instala MariaDB/MySQL y asegúrate de que 'mysqld' esté en el PATH.`
    );
  }

  log(`📦 MariaDB portable no encontrado en .dev/mariadb`);
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  await download(url, DOWNLOAD_FILE);

  log('📂 Extrayendo...');
  extract(DOWNLOAD_FILE);

  const entries = fs.readdirSync(DOWNLOAD_DIR).filter(e => e.startsWith('mariadb-'));
  if (entries.length === 0) {
    throw new Error('No se encontró el directorio mariadb-* tras extraer el paquete.');
  }
  const extracted = path.join(DOWNLOAD_DIR, entries[0]);
  fs.renameSync(extracted, MARIADB_DIR);

  // limpieza
  fs.rmSync(DOWNLOAD_FILE, { force: true });
  for (const e of fs.readdirSync(DOWNLOAD_DIR)) {
    if (e.startsWith('mariadb-'))
      fs.rmSync(path.join(DOWNLOAD_DIR, e), { recursive: true, force: true });
  }

  log(`✅ MariaDB portable listo en ${MARIADB_DIR}`);
}

// ------------------------------------------------------------- inicializar

function ensureDataDir() {
  if (fs.existsSync(path.join(DATA_DIR, 'mysql'))) {
    log('✅ Datadir ya inicializado.');
    return;
  }

  // Usa el MariaDB del sistema (solo SO sin portable)
  const marker = path.join(MARIADB_DIR, 'bin-marker.txt');
  if (fs.existsSync(marker)) {
    const sysBin = fs.readFileSync(marker, 'utf8').trim().replace('system:', '');
    const res = run('bash', ['-lc', `command -v ${sysBin}`], { stdio: 'pipe' });
    if (res.status === 0) {
      log(`ℹ️  El datadir lo inicializará ${sysBin} del sistema al arrancar (--initialize).`);
      return;
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  log('⚙️  Inicializando datadir...');
  const installer = isWindows ? 'mysql_install_db' : 'mariadb-install-db';
  const installBin = bin(installer);
  if (!fs.existsSync(installBin)) {
    // fallback al nombre clásico de Linux
    const alt = bin('mysql_install_db');
    if (!fs.existsSync(alt)) {
      throw new Error(`No se encontró ${installer} en ${MARIADB_DIR}/bin`);
    }
  }
  const cmd = fs.existsSync(bin(installer)) ? bin(installer) : bin('mysql_install_db');
  const args = isWindows
    ? [`--datadir=${DATA_DIR}`, '--service=']
    : [`--datadir=${DATA_DIR}`, '--skip-test-db'];
  const res = run(cmd, args, { cwd: MARIADB_DIR });
  if (res.status !== 0) {
    throw new Error(`Fallo al inicializar el datadir:\n${res.stderr || res.stdout}`);
  }
  log('✅ Datadir inicializado.');
}

// --------------------------------------------------------------- arranque

function isServerUp() {
  try {
    const res = run(bin('mysqladmin'), [
      '-h',
      DB_HOST,
      '-u',
      DB_USER,
      '--connect-timeout=2',
      'ping'
    ]);
    return res.status === 0;
  } catch {
    return false;
  }
}

function startServer() {
  if (isServerUp()) {
    log(`✅ Servidor ya está corriendo en ${DB_HOST}:${DB_PORT}.`);
    return;
  }

  const marker = path.join(MARIADB_DIR, 'bin-marker.txt');
  let mysqldBin = bin('mysqld');
  if (fs.existsSync(marker)) {
    mysqldBin = fs.readFileSync(marker, 'utf8').trim().replace('system:', '');
  }
  if (!fs.existsSync(mysqldBin)) {
    throw new Error(`No se encontró mysqld en ${mysqldBin}`);
  }

  const args = [
    `--datadir=${DATA_DIR}`,
    `--port=${DB_PORT}`,
    '--bind-address=127.0.0.1',
    `--sql-mode=${SQL_MODE}`
  ];

  log(`🚀 Arrancando MariaDB en ${DB_HOST}:${DB_PORT} (log: .dev/mariadb-server.log)...`);
  fs.mkdirSync(DEV_DIR, { recursive: true });
  const out = fs.openSync(LOG_FILE, 'a');
  const child = spawn(mysqldBin, args, {
    detached: true,
    stdio: ['ignore', out, out],
    cwd: MARIADB_DIR
  });
  child.unref();
}

function waitForServer(timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (isServerUp()) {
      log('✅ Servidor listo para conexiones.');
      return;
    }
    spawnSync('sleep', ['2']);
  }
  throw new Error(
    `El servidor MariaDB no respondió tras ${timeoutMs / 1000}s. Revisa el log: ${LOG_FILE}`
  );
}

// ------------------------------------------------------------ BD + schema

function ensureDatabase() {
  log(`🗄️  Asegurando base de datos '${DB_NAME}'...`);
  run(
    bin('mysql'),
    mysqlArgs([
      `-e`,
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    ])
  );

  const countRes = run(
    bin('mysql'),
    mysqlArgs([
      '-N',
      '-e',
      `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'`
    ])
  );
  const tableCount = parseInt((countRes.stdout || '').trim() || '0', 10);
  if (tableCount > 0) {
    log(`✅ La BD ya tiene ${tableCount} tablas. Schema intacto.`);
    return;
  }

  log(`📥 Importando ${path.relative(ROOT, SCHEMA_FILE)}...`);
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
  const res = run(bin('mysql'), mysqlArgs([DB_NAME]), { input: schema });
  if (res.status !== 0) {
    throw new Error(`Fallo al importar el schema:\n${res.stderr || res.stdout}`);
  }
  log('✅ Schema importado correctamente.');
}

// ------------------------------------------------------------------ main

async function main() {
  try {
    fs.mkdirSync(DEV_DIR, { recursive: true });
    await ensureMariaDB();
    ensureDataDir();
    startServer();
    waitForServer();
    ensureDatabase();
    log('');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('  BD de desarrollo lista. Para correr la integración:');
    log('');
    log(
      `  DB_HOST=${DB_HOST} DB_USER=${DB_USER} DB_PASSWORD=${DB_PASSWORD ? '***' : ''} DB_NAME=${DB_NAME} pnpm test:integration:legacy-db`
    );
    log(
      `  DB_HOST=${DB_HOST} DB_USER=${DB_USER} DB_PASSWORD=${DB_PASSWORD ? '***' : ''} DB_NAME=${DB_NAME} node tests/integration/order_flow.test.js`
    );
    log('');
    log('  Para detener el servidor:');
    log(
      `  ${path.join(MARIADB_DIR, 'bin', 'mysqladmin' + exe)} -h ${DB_HOST} -u ${DB_USER} shutdown`
    );
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
