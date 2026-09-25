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
  InventoryRepository
} from '@/lib/repositories/InventoryRepository';

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

async function crearBar(mlBotella: number | null, unidades: number): Promise<FixtureBar> {
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
    [presentacionId, productoId, '750 ml', 45000, 0, mlBotella]
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

it('el shot descuenta ml de la botella y la deja abierta con su contenido en el bar', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await fijarShotMl(50);
    const fixture = await crearBar(750, 1);

    await venderShots(fixture, 2, 'PGSHOT-ABIERTA');

    const unidades = await unidadesDe(fixture.presentacionId);
    expect(unidades).toHaveLength(1);
    expect(unidades[0].estado).toBe(ESTADO_UNIDAD_ACTIVA);
    expect(Number(unidades[0].ml_restante)).toBe(650);

    // El inventario del bar publica lo que le queda a la botella abierta.
    const [enBar] = await InventoryRepository.listBarStock(fixture.productoId);
    expect(enBar.stock_bar).toBe(1);
    expect(enBar.ml_abierta).toBe(650);

    const [movimiento] = await query(
      `SELECT ml, cantidad FROM inventario_movimientos
        WHERE presentacion_id = ? AND tipo = 'venta'`,
      [fixture.presentacionId]
    );
    expect(Number(movimiento.ml)).toBe(100);
    expect(Number(movimiento.cantidad)).toBe(0);

    // El histórico acumulado por presentación suma los shots servidos.
    await venderShots(fixture, 1, 'PGSHOT-HISTORICO');
    const [historico] = await InventoryRepository.listBarStock(fixture.productoId);
    expect(historico.ml_servidos).toBe(150);
    expect(Number((await unidadesDe(fixture.presentacionId))[0].ml_restante)).toBe(600);

    // El panel de resumen refleja el turno: lo servido hoy y lo que queda abierto.
    const resumen = await InventoryRepository.getShotsSummary();
    expect(resumen.shotMl).toBe(50);
    expect(resumen.mlServidosHoy).toBe(150);
    expect(resumen.shotsServidosHoy).toBe(3);
    expect(resumen.mlRestantesTotales).toBe(600);
    expect(resumen.botellasAbiertas).toBe(1);
    expect(resumen.botellasPorAgotarse).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('al agotar los ml la botella abierta pasa a vendida', async () => {
  const snapshot = await snapshotDatabase();
  try {
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

    const [enBar] = await InventoryRepository.listBarStock(fixture.productoId);
    expect(enBar.stock_bar).toBe(0);
    expect(enBar.ml_abierta).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('la botella completa sigue descontando unidades completas junto a los shots', async () => {
  const snapshot = await snapshotDatabase();
  try {
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
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('avisa al barman cuando una botella abierta queda bajo el umbral de shots', async () => {
  const snapshot = await snapshotDatabase();
  try {
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
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('rechaza la venta por shot sin botellas en el bar y no registra la venta', async () => {
  const snapshot = await snapshotDatabase();
  try {
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
    await restoreDatabase(snapshot, 'test-only');
  }
});
