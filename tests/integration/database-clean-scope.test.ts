import { expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { connectionConfig, quoteIdentifier } from '../../lib/database/postgres.cjs';

const transaction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/database/db', () => ({ withTransaction: transaction }));
import { cleanDatabase } from '@/lib/database/maintenance';

it('vacía datos y nuevas tablas, conserva identidad y revierte relaciones protegidas incompatibles', async () => {
  if (!/^qa_browser_\d+$/.test(process.env.DB_NAME || '')) throw Error('QA only');
  const pool = new Pool(connectionConfig());
  const client = await pool.connect();
  const schema = `qa_clean_${crypto.randomUUID().replaceAll('-', '')}`;
  const q = quoteIdentifier;
  try {
    await client.query(`CREATE SCHEMA ${q(schema)}`);
    await client.query(`SET search_path TO ${q(schema)}`);
    await client.query(`
      CREATE TABLE roles (id integer PRIMARY KEY);
      CREATE TABLE usuarios (id integer PRIMARY KEY, role_id integer REFERENCES roles(id));
      CREATE TABLE permissions (id integer PRIMARY KEY);
      CREATE TABLE role_permissions (role_id integer REFERENCES roles(id), permission_id integer REFERENCES permissions(id));
      CREATE TABLE _postgres_migrations (id integer PRIMARY KEY);
      CREATE TABLE productos (id integer PRIMARY KEY);
      CREATE TABLE compras (id integer PRIMARY KEY);
      CREATE TABLE inventario_unidades (id integer PRIMARY KEY, producto_id integer REFERENCES productos(id), compra_id integer REFERENCES compras(id));
      CREATE TABLE ventas (id integer PRIMARY KEY, usuario_id integer REFERENCES usuarios(id));
      CREATE TABLE configuraciones (id integer PRIMARY KEY);
      CREATE TABLE backups (id integer PRIMARY KEY);
      CREATE TABLE tabla_nueva (id integer PRIMARY KEY);
      INSERT INTO roles VALUES (1);
      INSERT INTO usuarios VALUES (1,1);
      INSERT INTO permissions VALUES (1);
      INSERT INTO role_permissions VALUES (1,1);
      INSERT INTO _postgres_migrations VALUES (75);
      INSERT INTO productos VALUES (1);
      INSERT INTO compras VALUES (1);
      INSERT INTO inventario_unidades VALUES (1,1,1);
      INSERT INTO ventas VALUES (1,1);
      INSERT INTO configuraciones VALUES (1);
      INSERT INTO backups VALUES (1);
      INSERT INTO tabla_nueva VALUES (1);
    `);
    transaction.mockImplementation(async callback => {
      await client.query('BEGIN');
      try {
        const result = await callback(
          async (sql: string, params?: unknown[]) => (await client.query(sql, params)).rows
        );
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
    const result = await cleanDatabase();
    for (const table of result.skippedTables) {
      expect((await client.query(`SELECT count(*)::int AS n FROM ${q(table)}`)).rows[0].n).toBe(1);
    }
    expect(result.deletedTables.sort()).toEqual(
      [
        'productos',
        'compras',
        'inventario_unidades',
        'ventas',
        'configuraciones',
        'backups',
        'tabla_nueva'
      ].sort()
    );
    for (const table of result.deletedTables) {
      expect((await client.query(`SELECT count(*)::int AS n FROM ${q(table)}`)).rows[0].n).toBe(0);
    }
    await client.query('INSERT INTO productos VALUES (2)');
    await client.query(
      'ALTER TABLE usuarios ADD COLUMN producto_id integer REFERENCES productos(id)'
    );
    await client.query('UPDATE usuarios SET producto_id=2');
    await expect(cleanDatabase()).rejects.toMatchObject({ code: '0A000' });
    expect((await client.query('SELECT id FROM productos')).rows).toEqual([{ id: 2 }]);
    expect((await client.query('SELECT id FROM usuarios')).rows).toEqual([{ id: 1 }]);
  } finally {
    await client.query('RESET search_path');
    await client.query(`DROP SCHEMA IF EXISTS ${q(schema)} CASCADE`);
    client.release();
    await pool.end();
  }
});
