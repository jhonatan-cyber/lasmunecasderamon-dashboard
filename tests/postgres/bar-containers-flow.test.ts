import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));
vi.mock('@/modules/auditoria/alertas/servicio', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { generarEan13Interno } from '@/modules/inventario/helpers';
import {
  confirmarRecepcionEnvase,
  ESTADO_UNIDAD_VENDIDA,
  listarDevoluciones,
  verificarEnvase
} from '@/modules/inventario';
import {
  checkWarehouseContainerAlerts,
  getContainerReturnsSummary
} from '@/lib/business/containerAlerts';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

interface FixtureEnvase {
  usuarioId: string;
  productoId: string;
  unidadId: string;
  codigo: string;
  codigoBarras: string;
  nombreProducto: string;
}

/** Crea un producto con una presentación y una unidad en el bar en el estado dado. */
async function crearEnvase(estado: string, abiertaPorShots = true): Promise<FixtureEnvase> {
  const [usuario] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
  const productoId = crypto.randomUUID();
  const presentacionId = crypto.randomUUID();
  const unidadId = crypto.randomUUID();
  const sufijo = productoId.slice(0, 8).toUpperCase();
  const codigo = `PGC${sufijo}`;
  const codigoBarras = generarEan13Interno();
  const nombreProducto = `Envase PG ${sufijo}`;

  await query(
    `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea)
     VALUES (?, ?, ?, ?, ?, ?, now())`,
    [productoId, `PGP${sufijo}`, nombreProducto, 40000, 0, 'Fixture envases']
  );
  await query(
    `INSERT INTO inventario_presentaciones
       (id, producto_id, nombre, precio_venta, comision, ml_botella, fecha_crea)
     VALUES (?, ?, ?, ?, ?, ?, now())`,
    [presentacionId, productoId, '750 ml', 40000, 0, 750]
  );
  await query(
    `INSERT INTO inventario_unidades
       (id, producto_id, presentacion_id, codigo, codigo_barras, ubicacion, estado,
        abierta_por_shots, fecha_crea)
     VALUES (?, ?, ?, ?, ?, 'bar', ?, ?, now())`,
    [unidadId, productoId, presentacionId, codigo, codigoBarras, estado, abiertaPorShots]
  );

  return {
    usuarioId: usuario.id_usuario,
    productoId,
    unidadId,
    codigo,
    codigoBarras,
    nombreProducto
  };
}

it('el bar entrega y el almacén confirma; los rechazos de cada paso no escriben', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const vacia = await crearEnvase(ESTADO_UNIDAD_VENDIDA);
    const llena = await crearEnvase('almacen');
    // Otro envase vacío que el bar entrega pero el almacén todavía no confirma.
    const pendiente = await crearEnvase(ESTADO_UNIDAD_VENDIDA);

    // Escaneo válido por EAN-13: es nuestro, vacío y sin devolver → se marca.
    const ok = await verificarEnvase(vacia.codigoBarras, vacia.usuarioId);
    expect(ok.ok).toBe(true);

    const [fila] = await query(
      'SELECT fecha_devolucion, devuelto_por FROM inventario_unidades WHERE id = ?',
      [vacia.unidadId]
    );
    expect(fila.fecha_devolucion).not.toBeNull();
    expect(fila.devuelto_por).toBe(vacia.usuarioId);

    // Re-escaneo por SKU (la unidad se busca por barra o por código): ya devuelto.
    const rescan = await verificarEnvase(vacia.codigo, vacia.usuarioId);
    expect(rescan).toMatchObject({ ok: false, motivo: 'ya_devuelto' });

    // Un envase lleno no se puede devolver: no está vacío.
    const llenaRes = await verificarEnvase(llena.codigoBarras, llena.usuarioId);
    expect(llenaRes).toMatchObject({ ok: false, motivo: 'no_esta_vacia' });

    // La botella vendida entera (sin shots) no entra al control: su envase se
    // lo llevó el cliente (migración 042).
    const entera = await crearEnvase(ESTADO_UNIDAD_VENDIDA, false);
    const enteraRes = await verificarEnvase(entera.codigoBarras, entera.usuarioId);
    expect(enteraRes).toMatchObject({ ok: false, motivo: 'venta_entera' });
    const [filaEntera] = await query(
      'SELECT fecha_devolucion FROM inventario_unidades WHERE id = ?',
      [entera.unidadId]
    );
    expect(filaEntera.fecha_devolucion).toBeNull();

    // Un código que no registramos nosotros no es nuestro.
    const ajeno = await verificarEnvase('7800000000001', vacia.usuarioId);
    expect(ajeno).toMatchObject({ ok: false, motivo: 'no_es_nuestro', unidad: null });

    // --- Paso 2 (almacén): la recepción la confirma quien recibe, no quien entrega.

    // Sin entrega del bar no hay nada que recibir.
    const sinEntrega = await confirmarRecepcionEnvase(llena.codigoBarras, vacia.usuarioId);
    expect(sinEntrega).toMatchObject({ ok: false, motivo: 'no_entregado' });

    // Entrega pendiente y entrega confirmada conviven en el historial.
    const entregaPendiente = await verificarEnvase(pendiente.codigoBarras, pendiente.usuarioId);
    expect(entregaPendiente.ok).toBe(true);

    const confirmada = await confirmarRecepcionEnvase(vacia.codigoBarras, vacia.usuarioId);
    expect(confirmada.ok).toBe(true);

    const [recepcion] = await query(
      'SELECT fecha_confirmacion, confirmado_por FROM inventario_unidades WHERE id = ?',
      [vacia.unidadId]
    );
    expect(recepcion.fecha_confirmacion).not.toBeNull();
    expect(recepcion.confirmado_por).toBe(vacia.usuarioId);

    // El almacén no puede recibir dos veces el mismo envase.
    const reConfirmacion = await confirmarRecepcionEnvase(vacia.codigo, vacia.usuarioId);
    expect(reConfirmacion).toMatchObject({ ok: false, motivo: 'ya_confirmado' });

    // Un código ajeno tampoco se confirma.
    const ajenoConfirmado = await confirmarRecepcionEnvase('7800000000001', vacia.usuarioId);
    expect(ajenoConfirmado).toMatchObject({ ok: false, motivo: 'no_es_nuestro', unidad: null });

    // El historial trae el envase con su producto, su entrega y su recepción.
    const historial = await listarDevoluciones();
    const registro = historial.find(r => r.id === vacia.unidadId);
    expect(registro).toBeDefined();
    expect(registro!.producto_nombre).toBe(vacia.nombreProducto);
    expect(registro!.presentacion_nombre).toBe('750 ml');
    expect(registro!.fecha_devolucion).toBeTruthy();
    expect(registro!.devuelto_por).toBe(vacia.usuarioId);
    expect(registro!.usuario_nick || registro!.usuario_nombre).toBeTruthy();
    expect(registro!.fecha_confirmacion).toBeTruthy();
    expect(registro!.confirmado_por).toBe(vacia.usuarioId);
    expect(registro!.confirmado_nick || registro!.confirmado_nombre).toBeTruthy();
    expect(registro!.pendiente_confirmacion).toBe(false);

    const registroPendiente = historial.find(r => r.id === pendiente.unidadId);
    expect(registroPendiente).toBeDefined();
    expect(registroPendiente!.pendiente_confirmacion).toBe(true);
    expect(registroPendiente!.confirmado_por).toBeNull();
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('las migraciones 032 y 033 dejan las columnas y los permisos en los roles correctos', async () => {
  // Lecturas sobre el catálogo: si fallan, la base de pruebas no tiene las migraciones aplicadas.
  const [columna] = await query(
    `SELECT 1 AS ok FROM information_schema.columns
      WHERE table_name = 'inventario_unidades' AND column_name = 'fecha_devolucion'`
  );
  expect(columna).toBeDefined();

  const [devueltoPor] = await query(
    `SELECT 1 AS ok FROM information_schema.columns
      WHERE table_name = 'inventario_unidades' AND column_name = 'devuelto_por'`
  );
  expect(devueltoPor).toBeDefined();

  const [permiso] = await query(
    `SELECT id FROM permissions
      WHERE module = 'products' AND action = 'return_container' AND deleted_at IS NULL`
  );
  expect(permiso).toBeDefined();

  const otorgamiento = await query(
    `SELECT 1 FROM role_permissions rp
       INNER JOIN roles r ON r.id_rol = rp.role_id
       INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE LOWER(r.nombre) = 'barman'
        AND p.module = 'products' AND p.action = 'return_container' AND p.deleted_at IS NULL`
  );
  expect(otorgamiento.length).toBeGreaterThan(0);

  // 033: la recepción se registra aparte y la confirma el almacén.
  for (const columna of ['fecha_confirmacion', 'confirmado_por']) {
    const [existe] = await query(
      `SELECT 1 AS ok FROM information_schema.columns
        WHERE table_name = 'inventario_unidades' AND column_name = ?`,
      [columna]
    );
    expect(existe, `falta la columna ${columna}`).toBeDefined();
  }

  const [permisoRecepcion] = await query(
    `SELECT id FROM permissions
      WHERE module = 'products' AND action = 'confirm_container_return' AND deleted_at IS NULL`
  );
  expect(permisoRecepcion).toBeDefined();

  const conRecepcion = (await query(
    `SELECT LOWER(r.nombre) AS rol FROM role_permissions rp
       INNER JOIN roles r ON r.id_rol = rp.role_id
       INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE p.module = 'products' AND p.action = 'confirm_container_return' AND p.deleted_at IS NULL`
  )) as Array<{ rol: string }>;
  expect(conRecepcion.map(r => r.rol)).toContain('administrador');
  // Quien entrega no confirma su propia entrega.
  expect(conRecepcion.map(r => r.rol)).not.toContain('barman');

  // 042: la traza de botella abierta por shots (solo esas devuelven envase).
  const [columnaShots] = await query(
    `SELECT 1 AS ok FROM information_schema.columns
      WHERE table_name = 'inventario_unidades' AND column_name = 'abierta_por_shots'`
  );
  expect(columnaShots).toBeDefined();
});

it('el resumen cuenta entregados, atrasados y confirmados, y el chequeo avisa al almacén', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const reciente = await crearEnvase(ESTADO_UNIDAD_VENDIDA);
    const atrasado = await crearEnvase(ESTADO_UNIDAD_VENDIDA);
    const recibido = await crearEnvase(ESTADO_UNIDAD_VENDIDA);

    // El bar entrega los tres envases.
    for (const envase of [reciente, atrasado, recibido]) {
      const marcado = await verificarEnvase(envase.codigoBarras, envase.usuarioId);
      expect(marcado.ok).toBe(true);
    }

    // El almacén confirma uno y otro lleva más de 2 horas esperando recepción.
    const confirmado = await confirmarRecepcionEnvase(recibido.codigoBarras, recibido.usuarioId);
    expect(confirmado.ok).toBe(true);
    await query(
      `UPDATE inventario_unidades SET fecha_devolucion = (?::timestamp - interval '3 hours') WHERE id = ?`,
      [getNowInBusinessTimezone(), atrasado.unidadId]
    );

    const resumen = await getContainerReturnsSummary();
    expect(resumen).toEqual({ pendientes: 2, vencidos: 1 });

    // El chequeo publica el estado en vivo y crea la campana del almacén.
    delete (globalThis as { __warehouseContainerAlert?: number }).__warehouseContainerAlert;
    const chequeo = await checkWarehouseContainerAlerts();
    expect(chequeo).toEqual({ pendientes: 2, vencidos: 1 });

    const avisos = await query<Array<{ titulo: string; mensaje: string }>>(
      `SELECT titulo, mensaje FROM notificaciones
        WHERE tipo = 'warehouse_container_alert' ORDER BY fecha_crea DESC`
    );
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos[0].titulo).toContain('Envases esperando recepción');
    expect(avisos[0].mensaje).toContain('1 envase');

    // Repetir el chequeo con los mismos números no vuelve a avisar.
    const antes = await query<Array<{ total: number }>>(
      `SELECT COUNT(*)::int AS total FROM notificaciones WHERE tipo = 'warehouse_container_alert'`
    );
    const repetido = await checkWarehouseContainerAlerts();
    expect(repetido).toEqual({ pendientes: 2, vencidos: 1 });
    const despues = await query<Array<{ total: number }>>(
      `SELECT COUNT(*)::int AS total FROM notificaciones WHERE tipo = 'warehouse_container_alert'`
    );
    expect(despues[0].total).toBe(antes[0].total);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
