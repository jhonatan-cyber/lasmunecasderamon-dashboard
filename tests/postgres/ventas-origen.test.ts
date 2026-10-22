import { afterAll, expect, it } from 'vitest';

import db, { query } from '@/lib/database/db';
import { restoreDatabase, snapshotDatabase } from '@/lib/database/maintenance';
import { ESTADO_UNIDAD_ACTIVA } from '@/modules/inventario/estados';
import { SaleService } from '@/workflows/ventas';

/**
 * Origen persistido de la venta (migración 098).
 *
 * El origen se decide en el servidor y se guarda en `ventas.origen`; el caso de
 * la entrada ya se cubre en `entradas-cortesia.test.ts`. Acá se fija el default
 * real (una venta de barra sin vínculos) y que el esquema no acepte valores que
 * el negocio ya no usa, como `cuenta` (el pospago se reemplazó por prepago).
 */

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

async function primerUsuarioActivo(): Promise<string> {
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios WHERE estado = 1 ORDER BY fecha_crea ASC LIMIT 1'
  );
  if (!usuario) throw new Error('La base de pruebas no tiene usuarios activos');
  return usuario.id_usuario;
}

async function cajaAbierta(): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO cajas
       (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, monto_cierre,
        efectivo, tarjeta, transferencia, venta, cargo_tarjeta, iva, comision,
        propina, anticipo, estado)
     VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
    [id, await primerUsuarioActivo()]
  );
  return id;
}

interface Bebida {
  productoId: string;
  presentacionId: string;
}

async function crearBebida(nombre: string, precio: number): Promise<Bebida> {
  const productoId = crypto.randomUUID();
  const presentacionId = crypto.randomUUID();
  const codigo = `ORG${productoId.slice(0, 8)}`;

  await query(
    `INSERT INTO productos
       (id_producto, codigo, nombre, categoria_id, precio, comision, fecha_crea)
     VALUES (?, ?, ?, NULL, ?, 0, now())`,
    [productoId, codigo, nombre, precio]
  );
  await query(
    `INSERT INTO inventario_presentaciones
       (id, producto_id, nombre, precio_venta, comision, ml_botella, opciones_venta)
     VALUES (?, ?, '750 ml', ?, 0, 750, ?::jsonb)`,
    [presentacionId, productoId, precio, JSON.stringify([{ tipo: 'botella', precio, comision: 0 }])]
  );
  await query(
    `INSERT INTO inventario_unidades
       (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea)
     VALUES (?, ?, ?, ?, 'bar', ?, now())`,
    [crypto.randomUUID(), productoId, presentacionId, `${codigo}U`, ESTADO_UNIDAD_ACTIVA]
  );

  return { productoId, presentacionId };
}

/** Venta directa de barra: sin entrada, pedido, servicio ni habitación. */
async function venderEnBarra(precio: number) {
  const cajaId = await cajaAbierta();
  const usuarioId = await primerUsuarioActivo();
  const bebida = await crearBebida('Bebida de barra', precio);

  const venta = await SaleService.createSale(
    {
      total: precio,
      sub_total: precio,
      total_comision: 0,
      metodo_pago: 'efectivo',
      propina: 0,
      tiempo: 0,
      usuarios: [],
      detalles: [
        {
          producto_id: bebida.productoId,
          presentacion_id: bebida.presentacionId,
          tipo_venta: 'botella',
          precio,
          comision: 0,
          cantidad: 1,
          sub_total: precio
        }
      ]
    },
    usuarioId
  );

  const ventaId = String(venta.id_venta);
  const [fila] = await query<{ origen: string; entrada_id: string | null }[]>(
    'SELECT origen, entrada_id FROM ventas WHERE id_venta = ?',
    [ventaId]
  );
  return { ventaId, cajaId, fila };
}

it('una venta de barra sin vínculos queda con origen barra', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const { fila } = await venderEnBarra(25000);

    expect(fila).toMatchObject({ origen: 'barra', entrada_id: null });
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('el esquema rechaza los orígenes que el negocio ya no usa', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const { ventaId } = await venderEnBarra(25000);

    // 'cuenta' era el pospago; hoy no puede entrar ni por la puerta de atrás.
    await expect(
      query("UPDATE ventas SET origen = 'cuenta' WHERE id_venta = ?", [ventaId])
    ).rejects.toThrow(/ventas_origen_check/);

    // La columna es obligatoria: el origen nunca queda vacío. El mensaje del
    // motor viene en el idioma del servidor, así que se afirma por columna.
    await expect(
      query('UPDATE ventas SET origen = NULL WHERE id_venta = ?', [ventaId])
    ).rejects.toThrow(/origen/i);

    const [fila] = await query<{ origen: string }[]>(
      'SELECT origen FROM ventas WHERE id_venta = ?',
      [ventaId]
    );
    expect(fila.origen).toBe('barra');
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
