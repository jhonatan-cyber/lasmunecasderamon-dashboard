import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));
vi.mock('@/lib/services/SecurityAlertService', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { SaleService } from '@/lib/services/SaleService';
import {
  ESTADO_UNIDAD_ACTIVA,
  ESTADO_UNIDAD_VENDIDA,
  listarStockBar,
  obtenerResumenShots
} from '@/modules/inventario';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

interface FixtureBar {
  usuarioId: string;
  productoId: string;
  presentacionId: string;
}

/** Carga `shot_ml` en la configuración para que el test no dependa de defaults. */
async function fijarShotMl(valor: number): Promise<void> {
  await query("UPDATE configuraciones SET valor = ? WHERE clave = 'shot_ml'", [String(valor)]);
  const [existe] = await query("SELECT id FROM configuraciones WHERE clave = 'shot_ml' LIMIT 1");
  if (!existe) {
    await query(
      'INSERT INTO configuraciones (id, clave, valor, categoria, tipo, fecha_crea) VALUES (?, ?, ?, ?, ?, now())',
      [crypto.randomUUID(), 'shot_ml', String(valor), 'bar', 'number']
    );
  }
}

async function snapshotBarDatabase() {
  const [configuracion] = await query<{ valor: string }[]>(
    "SELECT valor FROM configuraciones WHERE clave = 'shot_ml' LIMIT 1"
  );
  return { database: await snapshotDatabase(), shotMlOriginal: configuracion?.valor ?? null };
}

async function restoreBarDatabase(snapshot: {
  database: unknown;
  shotMlOriginal: string | null;
}): Promise<void> {
  await restoreDatabase(snapshot.database, 'test-only');
  if (snapshot.shotMlOriginal === null) {
    await query("DELETE FROM configuraciones WHERE clave = 'shot_ml'");
  } else {
    await query("UPDATE configuraciones SET valor = ? WHERE clave = 'shot_ml'", [
      snapshot.shotMlOriginal
    ]);
  }
}

async function crearBar(
  mlBotella: number | null,
  unidades: number,
  nombrePresentacion = '750 ml'
): Promise<FixtureBar> {
  const [usuario] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
  const productoId = crypto.randomUUID();
  const presentacionId = crypto.randomUUID();
  const sufijo = productoId.slice(0, 8);

  await query(
    `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea)
     VALUES (?, ?, ?, ?, ?, ?, now())`,
    [productoId, `PGS${sufijo}`, 'Whisky PG shot', 45000, 0, 'Fixture shots']
  );
  await query(
    `INSERT INTO inventario_presentaciones
       (id, producto_id, nombre, precio_venta, comision, ml_botella, fecha_crea)
     VALUES (?, ?, ?, ?, ?, ?, now())`,
    [presentacionId, productoId, nombrePresentacion, 45000, 0, mlBotella]
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

function venderShots(
  fixture: FixtureBar,
  cantidad: number,
  codigo: string,
  precio = 3000,
  total = 0
) {
  return SaleService.createSale(
    {
      codigo,
      total: total || precio * cantidad,
      sub_total: precio * cantidad,
      metodo_pago: 'efectivo',
      detalles: [
        {
          producto_id: fixture.productoId,
          presentacion_id: fixture.presentacionId,
          tipo_venta: 'shot',
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
}

async function unidadesDe(presentacionId: string) {
  return await query(
    `SELECT id, estado, ml_restante FROM inventario_unidades
      WHERE presentacion_id = ? ORDER BY fecha_crea ASC, codigo ASC`,
    [presentacionId]
  );
}

/** El volcado base puede no traer caja abierta: `createSale` exige una (NO_CAJA_ABIERTA). */
async function abrirCajaSiHaceFalta(): Promise<void> {
  const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
  let [caja] = await query('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1');
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

it('el shot descuenta ml de la botella y la deja abierta con su contenido en el bar', async () => {
  const snapshot = await snapshotBarDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    const fixture = await crearBar(750, 1);

    await venderShots(fixture, 2, 'PGSHOT-ABIERTA');

    const unidades = await unidadesDe(fixture.presentacionId);
    expect(unidades).toHaveLength(1);
    expect(unidades[0].estado).toBe(ESTADO_UNIDAD_ACTIVA);
    expect(Number(unidades[0].ml_restante)).toBe(650);

    // El inventario del bar publica lo que le queda a la botella abierta.
    const [enBar] = await listarStockBar(fixture.productoId);
    expect(enBar.stock_bar).toBe(1);
    expect(enBar.ml_abierta).toBe(650);

    const [movimiento] = await query(
      `SELECT ml, cantidad FROM inventario_movimientos
        WHERE presentacion_id = ? AND tipo = 'venta'`,
      [fixture.presentacionId]
    );
    expect(Number(movimiento.ml)).toBe(100);
    expect(Number(movimiento.cantidad)).toBe(0);

    // El panel de resumen refleja el turno: lo servido hoy y lo que queda abierto.
    // El resumen es global al bar, no del fixture: se mide en deltas para no
    // depender de las botellas que ya tenga abiertas la base.
    const base = await obtenerResumenShots();
    await venderShots(fixture, 1, 'PGSHOT-HISTORICO');
    const [historico] = await listarStockBar(fixture.productoId);
    expect(historico.ml_servidos).toBe(150);
    expect(Number((await unidadesDe(fixture.presentacionId))[0].ml_restante)).toBe(600);

    const resumen = await obtenerResumenShots();
    expect(resumen.shotMl).toBe(50);
    expect(resumen.mlServidosHoy - base.mlServidosHoy).toBe(50);
    expect(resumen.shotsServidosHoy - base.shotsServidosHoy).toBe(1);
    expect(resumen.mlRestantesTotales - base.mlRestantesTotales).toBe(-50);
    expect(resumen.botellasAbiertas - base.botellasAbiertas).toBe(0);
    expect(resumen.botellasPorAgotarse).toBe(base.botellasPorAgotarse);
  } finally {
    await restoreBarDatabase(snapshot);
  }
});

it('abre la botella con la capacidad que dice el nombre cuando la presentación no la tiene', async () => {
  const snapshot = await snapshotBarDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    // Ninguna presentación del bar guardaba `ml_botella`: el nombre es lo único que dice
    // el formato. Con el default de 750 ml, un shot de 50 dejaba 700 ml de una botella
    // de 1000 ml.
    const fixture = await crearBar(null, 1, '1000 ml');

    await venderShots(fixture, 1, 'PGSHOT-CAPACIDAD');

    const [unidad] = await unidadesDe(fixture.presentacionId);
    expect(unidad.estado).toBe(ESTADO_UNIDAD_ACTIVA);
    expect(Number(unidad.ml_restante)).toBe(950);

    // Y el bar publica lo mismo que el movimiento de venta: 1000 - 50.
    const [enBar] = await listarStockBar(fixture.productoId);
    expect(enBar.ml_abierta).toBe(950);
    expect(enBar.ml_servidos).toBe(50);
  } finally {
    await restoreBarDatabase(snapshot);
  }
});

it('al agotar los ml la botella abierta pasa a vendida', async () => {
  const snapshot = await snapshotBarDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    const fixture = await crearBar(100, 1);

    await venderShots(fixture, 1, 'PGSHOT-ABRE');
    let [unidad] = await unidadesDe(fixture.presentacionId);
    expect(unidad.estado).toBe(ESTADO_UNIDAD_ACTIVA);
    expect(Number(unidad.ml_restante)).toBe(50);

    await venderShots(fixture, 1, 'PGSHOT-VACIA');
    [unidad] = await unidadesDe(fixture.presentacionId);
    expect(unidad.estado).toBe(ESTADO_UNIDAD_VENDIDA);
    expect(Number(unidad.ml_restante)).toBe(0);

    const [enBar] = await listarStockBar(fixture.productoId);
    expect(enBar.stock_bar).toBe(0);
    expect(enBar.ml_abierta).toBe(0);
  } finally {
    await restoreBarDatabase(snapshot);
  }
});

it('la botella completa sigue descontando unidades completas junto a los shots', async () => {
  const snapshot = await snapshotBarDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    const fixture = await crearBar(750, 2);

    await SaleService.createSale(
      {
        codigo: 'PGSHOT-MIXTA',
        total: 48000,
        sub_total: 48000,
        metodo_pago: 'efectivo',
        detalles: [
          {
            producto_id: fixture.productoId,
            presentacion_id: fixture.presentacionId,
            tipo_venta: 'shot',
            precio: 3000,
            cantidad: 1,
            sub_total: 3000,
            comision: 0
          },
          {
            producto_id: fixture.productoId,
            presentacion_id: fixture.presentacionId,
            tipo_venta: 'botella',
            precio: 45000,
            cantidad: 1,
            sub_total: 45000,
            comision: 0
          }
        ],
        usuarios: []
      },
      fixture.usuarioId
    );

    const unidades = await unidadesDe(fixture.presentacionId);
    expect(unidades).toHaveLength(2);
    // La primera queda abierta con el shot servido; la segunda sale completa.
    expect(unidades[0].estado).toBe(ESTADO_UNIDAD_ACTIVA);
    expect(Number(unidades[0].ml_restante)).toBe(700);
    expect(unidades[1].estado).toBe(ESTADO_UNIDAD_VENDIDA);
  } finally {
    await restoreBarDatabase(snapshot);
  }
});

it('avisa al barman cuando una botella abierta queda bajo el umbral de shots', async () => {
  const snapshot = await snapshotBarDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    // Umbral por defecto 3 shots = 150 ml: una botella de 100 ml abre ya bajo el umbral.
    const fixture = await crearBar(100, 1);

    await venderShots(fixture, 1, 'PGSHOT-ALERTA');

    const avisos = await query(
      "SELECT titulo, mensaje FROM notificaciones WHERE tipo = 'bar_shot_alert' ORDER BY fecha_crea DESC"
    );
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos[0].titulo).toContain('Botella por agotarse');
    expect(avisos[0].mensaje).toContain('quedan 1 shot');
    expect(avisos[0].mensaje).toContain('50 ml');
  } finally {
    await restoreBarDatabase(snapshot);
  }
});

it('rechaza la venta por shot sin botellas en el bar y no registra la venta', async () => {
  const snapshot = await snapshotBarDatabase();
  try {
    await abrirCajaSiHaceFalta();
    await fijarShotMl(50);
    const fixture = await crearBar(750, 0);

    await expect(venderShots(fixture, 3, 'PGSHOT-SIN-STOCK')).rejects.toMatchObject({
      code: 'INSUFFICIENT_BAR_STOCK',
      details: expect.objectContaining({
        presentacion_id: fixture.presentacionId,
        ml_requeridos: 150
      })
    });

    const [venta] = await query('SELECT id_venta FROM ventas WHERE codigo = ?', [
      'PGSHOT-SIN-STOCK'
    ]);
    expect(venta).toBeUndefined();
    expect(await unidadesDe(fixture.presentacionId)).toHaveLength(0);
  } finally {
    await restoreBarDatabase(snapshot);
  }
});
