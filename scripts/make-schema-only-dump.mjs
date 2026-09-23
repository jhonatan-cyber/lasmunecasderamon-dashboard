#!/usr/bin/env node
/**
 * make-schema-only-dump.mjs — Convierte el dump base versionado en un dump de
 * solo esquema + semilla mínima, sin datos personales.
 *
 * Uso (one-shot contra el dump historico que hoy contiene las filas reales):
 *   node scripts/make-schema-only-dump.mjs <dump-origen> <dump-destino>
 *
 * Que conserva (datos de referencia del negocio, sin personas):
 *   roles, permissions, role_permissions, configuraciones, habitaciones,
 *   categorias, productos.
 *
 * Que elimina:
 *   - `usuarios` reales (nombre, telefono, email, hash de contraseña, run):
 *     se reemplaza por UN admin semilla con force_password_change = 1, para que
 *     la instalacion exija elegir contraseña en el primer login.
 *   - `codigos` (credencial viva del local): getOrCreateAttendanceCode() la
 *     acuna sola en el primer arranque.
 *   - Toda fila operacional: ventas, cajas, pedidos-asociados, clientes,
 *     asistencias, anticipos, propinas, logins, notificaciones, audit_logs,
 *     error_logs, gratificaciones, horas_extras, detalle_*, movimientos, etc.
 *   - El historial `_migrations`: el runner repuebla desde la cadena vigente.
 *
 * Identity RESTART WITH se resetea a 1: sin filas heredadas no hay offsets.
 *
 * El par esquema↔datos se mantiene porque el transformador NO toca DDL: el
 * gate de paridad (db:parity / db:diff) sigue siendo quien garantiza que este
 * dump + migraciones termina en el mismo esquema que la base de referencia.
 */
import fs from 'node:fs';

const [, , srcPath = 'database/lasmunecasderamon.postgres.sql', destPath = srcPath] =
  process.argv;

const SEED_KEEP = new Set([
  'roles',
  'permissions',
  'role_permissions',
  'configuraciones',
  'habitaciones',
  'categorias',
  'productos'
]);

// Orden semilla respetando FKs (role_permissions→roles/permissions, productos→categorias).
const SEED_ORDER = [
  'roles',
  'permissions',
  'role_permissions',
  'configuraciones',
  'habitaciones',
  'categorias',
  'productos'
];

const SEED_ADMIN = {
  id_usuario: '00000000-0000-0000-0000-000000000001',
  run: '00000000-0',
  nick: 'Admin',
  nombre: 'Administrador',
  apellido: 'Semilla',
  direccion: '-',
  telefono: '-',
  estado_civil: '-',
  afp: 'N/A',
  aporte: 0,
  sueldo: 0,
  descuento: 0,
  email: 'admin@localhost',
  // argon2 de 'Cambio2026!'. La instalacion exige cambiarla en el primer login
  // (force_password_change = 1, mismo mecanismo que usa UserService al crear personal).
  password: 'SEED_ADMIN_HASH_PLACEHOLDER',
  rol_id: '3c4ae24a-700a-436d-8bb8-d44e6d45b007', // Administrador
  foto: 'default.png',
  estado: 1,
  estado_servicio: 1,
  fecha_crea: 'now()', // resuelto por el reemplazo literal mas abajo
  fecha_mod: null,
  fecha_baja: null,
  push_token: null,
  qr_token: null,
  force_password_change: 1
};

const HEADER = `-- ============================================================
-- PostgreSQL — Solo esquema + semilla minima. SIN datos personales.
--
-- Generado por: scripts/make-schema-only-dump.mjs (transformador one-shot
-- sobre el dump historico de datos; ese dump fue retirado del repositorio
-- porque traia nombres, telefonos, correos y hashes del personal real).
--
-- Contenido:
--   1. DDL completo (tablas, indices, constraints, identidad, trigger).
--   2. Semilla: roles, permissions, role_permissions, configuraciones,
--      habitaciones, categorias, productos.
--   3. Un admin semilla (nick 'Admin', rol Administrador) con
--      force_password_change = 1: la primera sesion obliga a elegir
--      contraseña. La inicial documentada es 'Cambio2026!'.
--   4. El codigo del local NO viaja: se acuna solo en el primer arranque
--      (getOrCreateAttendanceCode).
--
-- Despues de importar este archivo se ejecutan las migraciones
-- (scripts/ci-setup-db.js o pnpm db:setup). NO editar a mano: regenerar con
-- el transformador a partir de un dump fresco de la base de referencia.
-- ============================================================
BEGIN;
`;

const SEED_ADMIN_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$mxfz3fcQghXvWPBAhOsALg$umrx4x8UJWWhUCQXp/GZrmzQM9qfN/QtcqLy88F3ruY';

function seedAdminSql(hash) {
  const values = [
    `'${SEED_ADMIN.id_usuario}'`,
    `'${SEED_ADMIN.run}'`,
    `'${SEED_ADMIN.nick}'`,
    `'${SEED_ADMIN.nombre}'`,
    `'${SEED_ADMIN.apellido}'`,
    `'${SEED_ADMIN.direccion}'`,
    `'${SEED_ADMIN.telefono}'`,
    `'${SEED_ADMIN.estado_civil}'`,
    `'${SEED_ADMIN.afp}'`,
    `${SEED_ADMIN.aporte}`,
    `${SEED_ADMIN.sueldo}`,
    `${SEED_ADMIN.descuento}`,
    `'${SEED_ADMIN.email}'`,
    `'${hash}'`,
    `'${SEED_ADMIN.rol_id}'`,
    `'${SEED_ADMIN.foto}'`,
    `${SEED_ADMIN.estado}`,
    `${SEED_ADMIN.estado_servicio}`,
    `CURRENT_TIMESTAMP`,
    `NULL`,
    `NULL`,
    `NULL`,
    `NULL`,
    `${SEED_ADMIN.force_password_change}`
  ];
  return `-- Admin semilla: contraseña inicial 'Cambio2026!' (force_password_change = 1).\n-- Verla cambiada en el primer login; no usada por ninguna persona real.\nINSERT INTO usuarios (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil, afp, aporte, sueldo, descuento, email, password, rol_id, foto, estado, estado_servicio, fecha_crea, fecha_mod, fecha_baja, push_token, qr_token, force_password_change) VALUES\n(${values.join(', ')});\n`;
}

// ---------------------------------------------------------------------------

const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

const firstInsert = lines.findIndex(l => /^INSERT INTO /.test(l));
if (firstInsert < 0) throw new Error('El dump origen no tiene INSERTs (ya es schema-only?)');

// 1) DDL: todo lo que va antes del primer INSERT (sin el header viejo ni BEGIN).
const ddlEnd = (() => {
  let i = firstInsert - 1;
  while (i >= 0 && (lines[i].trim() === '' || lines[i].startsWith('--'))) i--;
  return i; // ultima linea del DDL antes de los datos
})();
const ddlLines = lines.slice(0, ddlEnd + 1);
// Quita el header viejo (comentarios iniciales) y el BEGIN original.
const ddlBody = (() => {
  const beginIdx = ddlLines.findIndex(l => /^BEGIN;\s*$/.test(l));
  if (beginIdx < 0) throw new Error('No se encontro BEGIN en el dump origen');
  return ddlLines.slice(beginIdx + 1);
})();

// 2) Bloques INSERT completos (header hasta la linea que cierra con ';').
const inserts = new Map(); // tabla -> texto completo del bloque
for (let i = firstInsert; i < lines.length; ) {
  const m = lines[i].match(/^INSERT INTO ([a-z_]+) /);
  if (!m) { i++; continue; }
  const table = m[1];
  let j = i;
  while (j < lines.length && !/;\s*$/.test(lines[j])) j++;
  if (j >= lines.length) throw new Error(`INSERT de ${table} sin cierre ';'`);
  if (!inserts.has(table)) inserts.set(table, lines.slice(i, j + 1).join('\n'));
  i = j + 1;
}

const missing = [...SEED_KEEP].filter(t => !inserts.has(t));
if (missing.length) {
  throw new Error(`El dump origen no tiene semilla para: ${missing.join(', ')}`);
}

// 3) Seccion de datos nueva.
const seedBlocks = SEED_ORDER.map(t => inserts.get(t)).join('\n\n');
const dataSection = [seedBlocks, seedAdminSql(SEED_ADMIN_HASH)].join('\n\n');

// 4) Cola: desde el primer ALTER TABLE ADD PRIMARY KEY hasta COMMIT,
//    reseteando los identity RESTART WITH a 1.
const tailStart = lines.findIndex(l => /^ALTER TABLE .* ADD PRIMARY KEY /.test(l));
const commitIdx = lines.map(l => /^COMMIT;\s*$/.test(l)).lastIndexOf(true);
if (tailStart < 0 || commitIdx < 0) throw new Error('No se encontro la seccion de PKs o COMMIT');
const tail = lines
  .slice(tailStart, commitIdx + 1)
  .map(l => l.replace(/^(ALTER TABLE \w+ ALTER COLUMN \w+ RESTART WITH )\d+/, '$11'));

const out = HEADER + ddlBody.join('\n').replace(/\s+$/, '') + '\n\n' + dataSection + '\n\n' + tail.join('\n');

fs.writeFileSync(destPath, out, 'utf8');

const sizeKb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(0);
const oldKb = (Buffer.byteLength(src, 'utf8') / 1024).toFixed(0);
console.log(`OK: ${destPath} (${sizeKb} KB; origen ${oldKb} KB)`);
console.log(`Semilla: ${SEED_ORDER.join(', ')} + admin semilla (hash argon2 embebido).`);
