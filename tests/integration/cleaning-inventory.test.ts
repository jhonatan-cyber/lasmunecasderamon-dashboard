import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { accesoLimpieza, OperacionLimpiezaSchema } from '@/lib/business/limpieza';

const state = vi.hoisted(() => ({
  schema: `test_cleaning_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  pool: null as any
}));
vi.mock('@/lib/database/db', async () => {
  await import('dotenv/config');
  const { Pool } = await import('pg');
  const { default: postgres } = await import('@/lib/database/postgres.cjs');
  const { randomUUID } = await import('node:crypto');
  state.pool = new Pool({
    ...postgres.connectionConfig(),
    max: 4,
    options: `-c search_path=${state.schema},public`
  });
  return {
    generateUUID: randomUUID,
    query: async (sql: string, params: unknown[] = []) =>
      (await state.pool.query(postgres.prepareQuery(sql, params))).rows,
    withTransaction: async (callback: any) => {
      const client = await state.pool.connect();
      try {
        await client.query('BEGIN');
        const value = await callback(
          async (sql: string, params: unknown[] = []) =>
            (await client.query(postgres.prepareQuery(sql, params))).rows
        );
        await client.query('COMMIT');
        return value;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  };
});

import { listarLimpieza, operarLimpieza } from '@/modules/inventario/limpieza/servicio';
const almacen = { id: 'test-almacen', role: 'Almacenero' };
const barman = { id: 'test-bar', role: 'Barman' };
const caja = { id: 'test-caja', role: 'Cajero' };
const encargado = { id: 'test-local', role: 'Encargado local' };
async function articulo(unidad: 'litro' | 'unidad' = 'litro') {
  return (
    await operarLimpieza(
      { tipo: 'articulo', nombre: `Prueba ${randomUUID()}`, unidad, minimo: 2 },
      almacen
    )
  ).id;
}
async function ingreso(id: string, cantidad = 10) {
  await operarLimpieza(
    {
      tipo: 'ingreso',
      articulo_id: id,
      cantidad,
      proveedor: 'Prueba',
      costo_unitario: 5,
      nota: ''
    },
    almacen
  );
}
async function stock(id: string) {
  return (await listarLimpieza(almacen)).articulos.find(a => a.id === id)!;
}

beforeAll(async () => {
  await state.pool.query(`CREATE SCHEMA ${state.schema}`);
  await state.pool.query(await readFile('migrations/070_inventario_limpieza.sql', 'utf8'));
  await state.pool.query(
    'CREATE TABLE usuarios (id_usuario text PRIMARY KEY, nombre text, apellido text)'
  );
  await state.pool.query(
    "INSERT INTO usuarios VALUES ('test-almacen','Almacenero','Prueba'),('test-bar','Barman','Prueba')"
  );
});
afterAll(async () => {
  try {
    if (!/^test_cleaning_[a-z0-9_]+$/.test(state.schema)) throw new Error('Invalid test schema');
    await state.pool.query(`DROP SCHEMA IF EXISTS ${state.schema} CASCADE`);
  } finally {
    await state.pool.end();
  }
});

describe('inventario de limpieza con PostgreSQL aislado', () => {
  it('valida cantidades, unidad y acceso', () => {
    expect(accesoLimpieza('Barman').ubicaciones).toEqual(['bar']);
    expect(accesoLimpieza('Garzon').ubicaciones).toEqual([]);
    expect(
      OperacionLimpiezaSchema.safeParse({
        tipo: 'consumo',
        articulo_id: randomUUID(),
        cantidad: -1,
        origen: 'bar',
        nota: 'Uso'
      }).success
    ).toBe(false);
    expect(
      OperacionLimpiezaSchema.safeParse({
        tipo: 'ingreso',
        articulo_id: randomUUID(),
        cantidad: 0.0001
      }).success
    ).toBe(false);
  });
  it('registra ingreso, reserva tránsito y acepta una sola vez', async () => {
    const id = await articulo();
    await ingreso(id);
    const transfer = await operarLimpieza(
      {
        tipo: 'traspaso',
        articulo_id: id,
        cantidad: 3.5,
        origen: 'almacen',
        destino: 'bar',
        nota: ''
      },
      almacen
    );
    expect(await stock(id)).toMatchObject({ stock: { almacen: 6.5, bar: 0 }, en_transito: 3.5 });
    await operarLimpieza({ tipo: 'resolver', id: transfer.id, accion: 'aceptar' }, barman);
    expect(await stock(id)).toMatchObject({ stock: { almacen: 6.5, bar: 3.5 }, en_transito: 0 });
    await expect(
      operarLimpieza({ tipo: 'resolver', id: transfer.id, accion: 'aceptar' }, barman)
    ).rejects.toThrow('ya fue resuelto');
    expect((await stock(id)).stock.bar).toBe(3.5);
  });
  it('rechazar devuelve al origen y no ingresa al destino', async () => {
    const id = await articulo();
    await ingreso(id);
    const transfer = await operarLimpieza(
      {
        tipo: 'traspaso',
        articulo_id: id,
        cantidad: 4,
        origen: 'almacen',
        destino: 'caja',
        nota: ''
      },
      almacen
    );
    await operarLimpieza({ tipo: 'resolver', id: transfer.id, accion: 'rechazar' }, caja);
    expect(await stock(id)).toMatchObject({ stock: { almacen: 10, caja: 0 }, en_transito: 0 });
  });
  it('recibe en Local, consume y devuelve sobrantes al almacén', async () => {
    const id = await articulo();
    await ingreso(id);
    const transfer = await operarLimpieza(
      {
        tipo: 'traspaso',
        articulo_id: id,
        cantidad: 5,
        origen: 'almacen',
        destino: 'local',
        nota: ''
      },
      almacen
    );
    await operarLimpieza({ tipo: 'resolver', id: transfer.id, accion: 'aceptar' }, encargado);
    await operarLimpieza(
      { tipo: 'consumo', articulo_id: id, cantidad: 2, origen: 'local', nota: 'Limpieza de baños' },
      encargado
    );
    const devolución = await operarLimpieza(
      {
        tipo: 'traspaso',
        articulo_id: id,
        cantidad: 3,
        origen: 'local',
        destino: 'almacen',
        nota: ''
      },
      encargado
    );
    await operarLimpieza({ tipo: 'resolver', id: devolución.id, accion: 'aceptar' }, almacen);
    expect((await stock(id)).stock).toEqual({ almacen: 8, bar: 0, caja: 0, local: 0 });
  });
  it('bloquea ingresos y recepción ajena para el barman', async () => {
    const id = await articulo();
    await ingreso(id);
    await expect(
      operarLimpieza(
        {
          tipo: 'ingreso',
          articulo_id: id,
          cantidad: 1,
          costo_unitario: 0,
          proveedor: '',
          nota: ''
        },
        barman
      )
    ).rejects.toMatchObject({ statusCode: 403 });
    const transfer = await operarLimpieza(
      {
        tipo: 'traspaso',
        articulo_id: id,
        cantidad: 2,
        origen: 'almacen',
        destino: 'caja',
        nota: ''
      },
      almacen
    );
    await expect(
      operarLimpieza({ tipo: 'resolver', id: transfer.id, accion: 'aceptar' }, barman)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect((await stock(id)).en_transito).toBe(2);
  });
  it('dos traspasos concurrentes no pueden gastar el mismo stock', async () => {
    const id = await articulo();
    await ingreso(id, 5);
    const payload = {
      tipo: 'traspaso' as const,
      articulo_id: id,
      cantidad: 4,
      origen: 'almacen' as const,
      destino: 'bar' as const,
      nota: ''
    };
    const results = await Promise.allSettled([
      operarLimpieza(payload, almacen),
      operarLimpieza(payload, almacen)
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    expect(await stock(id)).toMatchObject({ stock: { almacen: 1, bar: 0 }, en_transito: 4 });
  });
  it('no permite cantidades fraccionadas de unidades y conserva el saldo', async () => {
    const id = await articulo('unidad');
    await ingreso(id, 3);
    await expect(
      operarLimpieza(
        { tipo: 'consumo', articulo_id: id, cantidad: 0.5, origen: 'almacen', nota: 'Prueba' },
        almacen
      )
    ).rejects.toThrow('cantidades enteras');
    expect((await stock(id)).stock.almacen).toBe(3);
  });
  it('dos recepciones simultáneas acreditan el stock solo una vez', async () => {
    const id = await articulo();
    await ingreso(id);
    const transfer = await operarLimpieza(
      {
        tipo: 'traspaso',
        articulo_id: id,
        cantidad: 2,
        origen: 'almacen',
        destino: 'bar',
        nota: ''
      },
      almacen
    );
    const op = { tipo: 'resolver' as const, id: transfer.id, accion: 'aceptar' as const };
    const results = await Promise.allSettled([
      operarLimpieza(op, barman),
      operarLimpieza(op, barman)
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await stock(id)).stock.bar).toBe(2);
  });
  it('el historial identifica al emisor y oculta movimientos de otras áreas', async () => {
    const data = await listarLimpieza(barman);
    expect(data.movimientos.every(m => m.origen === 'bar' || m.destino === 'bar')).toBe(true);
    expect(data.movimientos.some(m => m.creador_nombre === 'Almacenero Prueba')).toBe(true);
  });
});
