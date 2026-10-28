import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));
vi.mock('@/modules/auditoria/alertas/servicio', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { OrderService } from '@/modules/operacion';

/**
 * Baucher de un pedido cobrado con transferencia contra PostgreSQL real.
 *
 * El invariante que cuidan estas pruebas es que la constancia del pago exista
 * siempre: sin foto el pedido no se crea (400 en la API), y con foto el archivo
 * queda en `public/img/orders` mientras la fila guarda sólo su nombre.
 */

const DIRECTORIO_BAUCHERS = path.join(process.cwd(), 'public', 'img', 'orders');

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

/** PNG real y mínimo: `guardarFotoBaucher` lo pasa por sharp. */
async function fotoBaucher(): Promise<string> {
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 180, g: 40, b: 40 } }
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function primerUsuario(): Promise<string> {
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios LIMIT 1'
  );
  if (!usuario) throw new Error('La base de pruebas no tiene usuarios');
  return usuario.id_usuario;
}

async function leerBauchers(): Promise<string[]> {
  return (await fs.readdir(DIRECTORIO_BAUCHERS).catch(() => [] as string[])).sort();
}

async function productoDePrueba(): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    'INSERT INTO productos (id_producto, codigo, nombre, precio, comision, fecha_crea) VALUES (?, ?, ?, 6000, 0, now())',
    [id, `PGBAU${id.slice(0, 6).toUpperCase()}`, 'Producto baucher']
  );
  return id;
}

function pedidoBase(
  codigo: string,
  meseroId: string,
  productoId: string,
  metodoPago: 'efectivo' | 'transferencia',
  baucherFoto?: string
) {
  return {
    codigo,
    meseroId,
    metodoPago,
    subtotal: 6000,
    total: 6000,
    ...(baucherFoto ? { baucher_foto: baucherFoto } : {}),
    detalles: [
      {
        productoId,
        precio: 6000,
        comision: 0,
        cantidad: 1,
        subtotal: 6000,
        selectedHostesses: []
      }
    ]
  };
}

it('sin foto no crea el pedido y no deja ningún archivo nuevo', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const productoId = await productoDePrueba();
    const meseroId = await primerUsuario();
    const antes = await leerBauchers();

    await expect(
      OrderService.create(pedidoBase('PGBAUCHER1', meseroId, productoId, 'transferencia'))
    ).rejects.toThrow(/baucher/);

    expect(await query('SELECT id_pedido FROM pedidos WHERE codigo = ?', ['PGBAUCHER1'])).toEqual(
      []
    );
    // El rechazo ocurre antes de tocar el disco: no queda constancia huérfana.
    expect(await leerBauchers()).toEqual(antes);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('con foto guarda el archivo y el nombre en la fila del pedido', async () => {
  const snapshot = await snapshotDatabase();
  // La foto se escribe antes de la transacción: si el pedido falla, el archivo
  // queda. Se limpia cualquier archivo nuevo, no sólo el que se leyó de la fila.
  const antes = await leerBauchers();
  try {
    const productoId = await productoDePrueba();
    const meseroId = await primerUsuario();

    const pedido = await OrderService.create(
      pedidoBase('PGBAUCHER2', meseroId, productoId, 'transferencia', await fotoBaucher())
    );

    const [fila] = await query<{ metodo_pago: string; baucher_foto: string }[]>(
      'SELECT metodo_pago, baucher_foto FROM pedidos WHERE id_pedido = ?',
      [pedido.id]
    );
    expect(fila.metodo_pago).toBe('transferencia');
    expect(fila.baucher_foto).toMatch(/^order_\d+\.webp$/);

    // El endpoint que sirve la foto resuelve el nombre desde la fila del pedido.
    expect(await OrderService.getBaucherFoto(pedido.id)).toBe(fila.baucher_foto);
    const guardado = await fs.stat(path.join(DIRECTORIO_BAUCHERS, fila.baucher_foto));
    expect(guardado.size).toBeGreaterThan(0);
  } finally {
    for (const archivo of await leerBauchers())
      if (!antes.includes(archivo))
        await fs.rm(path.join(DIRECTORIO_BAUCHERS, archivo), { force: true });
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('si el pedido no llega a la base, la foto no queda huérfana en disco', async () => {
  const snapshot = await snapshotDatabase();
  const antes = await leerBauchers();
  try {
    const meseroId = await primerUsuario();
    // Producto inexistente: la validación falla dentro de la transacción, ya con
    // la foto escrita en disco (se guarda antes del `INSERT`).
    await expect(
      OrderService.create(
        pedidoBase(
          'PGBAUCHER4',
          meseroId,
          crypto.randomUUID(),
          'transferencia',
          await fotoBaucher()
        )
      )
    ).rejects.toThrow(/producto/i);

    expect(await query('SELECT id_pedido FROM pedidos WHERE codigo = ?', ['PGBAUCHER4'])).toEqual(
      []
    );
    expect(await leerBauchers()).toEqual(antes);
  } finally {
    // Red de seguridad: nada de esta corrida queda en el árbol de trabajo.
    for (const archivo of await leerBauchers())
      if (!antes.includes(archivo))
        await fs.rm(path.join(DIRECTORIO_BAUCHERS, archivo), { force: true });
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('el pago en efectivo sigue creando el pedido sin baucher', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const productoId = await productoDePrueba();
    const meseroId = await primerUsuario();

    const pedido = await OrderService.create(
      pedidoBase('PGBAUCHER3', meseroId, productoId, 'efectivo')
    );

    const [fila] = await query<{ baucher_foto: string | null }[]>(
      'SELECT baucher_foto FROM pedidos WHERE id_pedido = ?',
      [pedido.id]
    );
    expect(fila.baucher_foto).toBeNull();
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
