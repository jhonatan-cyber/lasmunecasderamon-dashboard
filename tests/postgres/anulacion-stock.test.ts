/**
 * Reversión de stock por anulación, contra la base real.
 *
 * Antes de la migración 058 anular una venta devolvía la plata y se quedaba con
 * las botellas: el bar perdía existencias en cada anulación y la venta siguiente
 * de lo mismo ya no encontraba el stock. Aquí se comprueba el camino completo
 * (consumo → anulación → stock de vuelta), no el SQL suelto.
 */
import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(),
  sendPushByUser: vi.fn()
}));
vi.mock('@/modules/auditoria/alertas/servicio', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { SaleService } from '@/workflows/ventas';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_VENDIDA } from '@/modules/inventario';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

interface Fixture {
  usuarioId: string;
  productoId: string;
  presentacionId: string;
}

async function fijarShotMl(valor: number): Promise<void> {
  const [existe] = await query("SELECT id FROM configuraciones WHERE clave = 'shot_ml' LIMIT 1");
  if (existe) {
    await query("UPDATE configuraciones SET valor = ? WHERE clave = 'shot_ml'", [String(valor)]);
  } else {
    await query(
      'INSERT INTO configuraciones (id, clave, valor, categoria, tipo, fecha_crea) VALUES (?, ?, ?, ?, ?, now())',
      [crypto.randomUUID(), 'shot_ml', String(valor), 'bar', 'number']
    );
  }
}

async function abrirCajaSiHaceFalta(): Promise<void> {
  const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
  const [caja] = await query('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1');
  if (!caja) {
    await query(
      `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
           monto_cierre, efectivo, tarjeta, transferencia, venta, cargo_tarjeta, iva, comision,
           propina, anticipo, estado)
         VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
      [crypto.randomUUID(), user.id_usuario]
    );
  }
}

async function crearBar(mlBotella: number, unidades: number): Promise<Fixture> {
  const [usuario] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
  const productoId = crypto.randomUUID();
  const presentacionId = crypto.randomUUID();
  const sufijo = productoId.slice(0, 8);

  await query(
    `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea)
     VALUES (?, ?, ?, ?, ?, ?, now())`,
    [productoId, `PGAN${sufijo}`, 'Whisky PG anulacion', 45000, 0, 'Fixture anulacion']
  );
  await query(
    `INSERT INTO inventario_presentaciones
       (id, producto_id, nombre, precio_venta, comision, ml_botella, fecha_crea)
     VALUES (?, ?, ?, ?, ?, ?, now())`,
    [presentacionId, productoId, '750 ml', 15000, 0, mlBotella]
  );
  for (let i = 0; i < unidades; i++) {
    await query(
      `INSERT INTO inventario_unidades
         (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea)
       VALUES (?, ?, ?, ?, 'bar', '${ESTADO_UNIDAD_ACTIVA}', now())`,
      [crypto.randomUUID(), productoId, presentacionId, `PGU${sufijo}${i}`]
    );
  }

  return { usuarioId: usuario.id_usuario, productoId, presentacionId };
}

async function vender(
  fixture: Fixture,
  cantidad: number,
  codigo: string,
  tipoVenta: 'botella' | 'shot' = 'botella',
  precio = 15000
) {
  const venta = await SaleService.createSale(
    {
      codigo,
      total: precio * cantidad,
      sub_total: precio * cantidad,
      metodo_pago: 'efectivo',
      detalles: [
        {
          producto_id: fixture.productoId,
          presentacion_id: fixture.presentacionId,
          tipo_venta: tipoVenta,
          precio,
          cantidad,
          sub_total: precio * cantidad,
          comision: 0
        }
      ],
      usuarios: []
    },
    fixture.usuarioId
  );
  return String((venta as { id_venta: string }).id_venta);
}

async function unidadesDe(presentacionId: string) {
  return await query<{ id: string; estado: string; ml_restante: number | null }[]>(
    `SELECT id, estado, ml_restante FROM inventario_unidades
      WHERE presentacion_id = ? ORDER BY fecha_crea ASC, codigo ASC`,
    [presentacionId]
  );
}

async function activasEnBar(presentacionId: string): Promise<number> {
  const [row] = await query<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM inventario_unidades
      WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'`,
    [presentacionId]
  );
  return Number(row?.total ?? 0);
}

it('anular una venta devuelve al bar las botellas que se llevaron', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    const fixture = await crearBar(750, 3);

    const ventaId = await vender(fixture, 2, 'PGAN-BOTELLAS');
    expect(await activasEnBar(fixture.presentacionId)).toBe(1);

    await SaleService.updateStatus(ventaId, 0, fixture.usuarioId);

    expect(await activasEnBar(fixture.presentacionId)).toBe(3);
    const movimientos = await query<{ tipo: string; cantidad: number; origen: string }[]>(
      `SELECT m.tipo, m.cantidad, o.tipo AS origen
         FROM inventario_movimientos m
         INNER JOIN inventario_movimientos o ON o.id = m.movimiento_origen
        WHERE m.venta_id = ? AND m.tipo = 'devolucion'`,
      [ventaId]
    );
    expect(movimientos).toHaveLength(1);
    expect(Number(movimientos[0].cantidad)).toBe(2);
    expect(movimientos[0].origen).toBe('venta');
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('anular una venta de shots devuelve los ml a la botella abierta', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    const fixture = await crearBar(750, 1);

    const ventaId = await vender(fixture, 4, 'PGAN-SHOTS', 'shot', 3000);
    const [despuesDeVender] = await unidadesDe(fixture.presentacionId);
    expect(despuesDeVender.estado).toBe(ESTADO_UNIDAD_ACTIVA);
    expect(Number(despuesDeVender.ml_restante)).toBe(550);

    await SaleService.updateStatus(ventaId, 0, fixture.usuarioId);

    const [unidad] = await unidadesDe(fixture.presentacionId);
    expect(unidad.estado).toBe(ESTADO_UNIDAD_ACTIVA);
    expect(Number(unidad.ml_restante)).toBe(750);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('una anulación parcial y luego la total devuelven cada botella una sola vez', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    const fixture = await crearBar(750, 4);

    const ventaId = await vender(fixture, 4, 'PGAN-PARCIAL');
    expect(await activasEnBar(fixture.presentacionId)).toBe(0);

    // Se anula la mitad del monto: la mitad de las botellas vuelven.
    await SaleService.approveAnulacion(ventaId, fixture.usuarioId, 30000);
    expect(await activasEnBar(fixture.presentacionId)).toBe(2);

    // Y la anulación total devuelve las que faltaban, sin repetir las de antes.
    await SaleService.updateStatus(ventaId, 0, fixture.usuarioId);
    expect(await activasEnBar(fixture.presentacionId)).toBe(4);

    const [devoluciones] = await query<{ unidades: number }[]>(
      `SELECT COALESCE(SUM(cantidad), 0) AS unidades
         FROM inventario_movimientos
        WHERE venta_id = ? AND tipo = 'devolucion'`,
      [ventaId]
    );
    expect(Number(devoluciones.unidades)).toBe(4);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('anular dos veces la misma venta no devuelve el mismo stock dos veces', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    const fixture = await crearBar(750, 2);

    const ventaId = await vender(fixture, 2, 'PGAN-IDEMPOTENTE');
    await SaleService.updateStatus(ventaId, 0, fixture.usuarioId);
    await SaleService.updateStatus(ventaId, 0, fixture.usuarioId);

    expect(await activasEnBar(fixture.presentacionId)).toBe(2);
    const devoluciones = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM inventario_movimientos WHERE venta_id = ? AND tipo = 'devolucion'`,
      [ventaId]
    );
    expect(Number(devoluciones[0].total)).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('anular una venta sin presentación no inventa stock ni falla', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaSiHaceFalta();
    const [usuario] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const venta = await SaleService.createSale(
      {
        codigo: 'PGAN-SIN-PRES',
        total: 5000,
        sub_total: 5000,
        metodo_pago: 'efectivo',
        detalles: [
          {
            producto_id: crypto.randomUUID(),
            precio: 5000,
            cantidad: 1,
            sub_total: 5000,
            comision: 0
          }
        ],
        usuarios: []
      },
      usuario.id_usuario
    );
    const ventaId = String((venta as { id_venta: string }).id_venta);

    await expect(SaleService.updateStatus(ventaId, 0, usuario.id_usuario)).resolves.toBeTruthy();
    const reversas = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM inventario_movimientos WHERE venta_id = ? AND tipo = 'devolucion'`,
      [ventaId]
    );
    expect(Number(reversas[0].total)).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
