#!/usr/bin/env node
/**
 * ci-setup-db.js — sembrar lo que el dump de solo esquema NO transporta y que
 * el resto del sistema y las pruebas necesitan para correr con una base limpia.
 *
 * Qué hace:
 *   1. Ejecuta el schema + semilla del dump (lasmunecasderamon.postgres.sql).
 *   2. Aplica las migraciones de `migrations/`.
 *   3. Si la semilla del dump llega incompleta para las pruebas actuales, la
 *      completa aquí (solo lo estrictamente necesario para que las suites no
 *      fallen por datos perdidos al rearmar la base).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SQL_DUMP_PATH = join(ROOT, 'database', 'lasmunecasderamon.postgres.sql');
const MIGRATIONS_DIR = join(ROOT, 'migrations');

function conexionOpts() {
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD == null ? '' : String(process.env.DB_PASSWORD);
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    user,
    password,
    database: process.env.DB_NAME || 'lasmunecasderamon',
    max: 4
  };
}

async function run() {
  const { Pool } = await import('pg');
  const pool = new Pool(conexionOpts());

  try {
    const dump = readFileSync(SQL_DUMP_PATH, 'utf8');
    await pool.query(dump);
    console.log('OK: esquema + semilla básica');

    const { migrate } = await import('./postgres-migrations.mjs');
    await migrate(pool, { directory: MIGRATIONS_DIR });
    console.log('OK: migraciones aplicadas');

    await completarSemilla(pool);
    console.log('OK: semilla de pruebas completada');
  } finally {
    await pool.end();
  }
}

async function completarSemilla(pool) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    try {
      await sembrarPermisosFaltantes(cliente);
      await cliente.query('COMMIT');
    } catch (e) {
      await cliente.query('ROLLBACK');
      throw e;
    }
  } finally {
    cliente.release();
  }
}

async function sembrarPermisosFaltantes(cliente) {
  const seeds = [
    {
      id: 'cb15bb20-559b-40f4-96c6-03bedf1a1201',
      name: 'Aceptar transferencias de barra',
      description: 'Confirmar la recepción de productos enviados desde almacén al bar',
      module: 'products',
      action: 'accept_transfer'
    },
    {
      id: 'bc01d1a6-253c-4e07-9bfe-68c4dfbd153a',
      name: 'Actualizar precio de productos',
      description:
        'Permiso para actualizar el precio de venta y comisión de un producto en el catálogo',
      module: 'products',
      action: 'update_price'
    },
    {
      id: '59529e20-ae8c-42cd-9f97-b28dc4e7c3ad',
      name: 'Ver reservas del quincho',
      description: 'Ver las reservas del quincho',
      module: 'reservas_quincho',
      action: 'view'
    },
    {
      id: 'e5a85ff9-a91e-402c-97b7-30b8ef097848',
      name: 'Crear reservas del quincho',
      description: 'Crear una nueva reserva del quincho',
      module: 'reservas_quincho',
      action: 'create'
    },
    {
      id: '638b8cc3-0303-4809-91e2-8070a7fd4750',
      name: 'Editar reservas del quincho',
      description: 'Editar una reserva del quincho',
      module: 'reservas_quincho',
      action: 'edit'
    },
    // 032_devolver_envases: el bar puede marcar un envase como devuelto.
    {
      id: '0a3cd37b-2c25-4fe1-9d1d-6e60c4b8d0a0',
      name: 'Devolver envases al almacén',
      description: 'Marcar la devolución de un envase vacío escaneado en barra',
      module: 'products',
      action: 'return_container'
    },
    // 033_recepcion_envases_almacen: solo el almacén confirma la recepción.
    {
      id: '1b4ce38c-3d36-4ff2-0e2e-7f71d5c9e1b1',
      name: 'Confirmar recepción de envases',
      description: 'Confirmar la recepción de envases vacíos entregados por barra',
      module: 'products',
      action: 'confirm_container_return'
    }
  ];

  for (const s of seeds) {
    // La restricción es unique_permission sobre (module, action), no sobre el id:
    // la migración 032 ya siembra return_container con otro id, así que buscar
    // sólo por id no lo ve y el INSERT revienta la semilla con 23505.
    const existe = await cliente.query(
      'SELECT 1 FROM permissions WHERE id = $1 OR (module = $2 AND action = $3)',
      [s.id, s.module, s.action]
    );
    if (!existe.rows.length) {
      await cliente.query(
        `INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [s.id, s.name, s.description, s.module, s.action]
      );
    }
  }

  const roles = await cliente.query(
    `SELECT id_rol, nombre FROM roles WHERE lower(nombre) IN ('barman', 'administrador')`
  );
  const actionByModule = new Map([
    [
      'products',
      ['view', 'accept_transfer', 'update_price', 'return_container', 'confirm_container_return']
    ],
    ['reservas_quincho', ['view', 'create', 'edit']]
  ]);

  for (const r of roles.rows) {
    const actions =
      actionByModule.get(r.nombre === 'barman' ? 'products' : 'reservas_quincho') || [];
    if (!actions.length) continue;
    const permisos = await cliente.query(
      `SELECT id FROM permissions WHERE module = $1 AND action = ANY($2) AND deleted_at IS NULL`,
      [r.nombre === 'barman' ? 'products' : 'reservas_quincho', actions]
    );
    for (const p of permisos.rows) {
      const enlazado = await cliente.query(
        `SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2`,
        [r.id_rol, p.id]
      );
      if (!enlazado.rows.length) {
        await cliente.query(
          `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
VALUES (gen_random_uuid()::text, $1, $2, now())`,
          [r.id_rol, p.id]
        );
      }
    }
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
