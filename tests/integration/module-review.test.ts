import { beforeAll, beforeEach, afterAll, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { cobrarCuentaConVenta } from '@/workflows/cobrar-cuenta';
import {
  anularVentaTotalEnUnidad,
  anularVentaParcialEnUnidad
} from '@/workflows/anulaciones-venta';
import { obtenerHistorial } from '@/modules/clientes/fichas/repositorio';
import { EventQueries } from '@/modules/agenda/eventos/consultas';
import { VentasStatsRepository } from '@/modules/reportes/ventas/repositorio';
import { totalCaja } from '@/lib/business/cajaEfectivo';

const state = vi.hoisted(() => ({
  schema: `test_review_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  pool: null as any,
  tables: [] as string[]
}));
vi.mock('@/lib/database/db', async () => {
  await import('dotenv/config');
  const { Pool } = await import('pg');
  const { default: pg } = await import('@/lib/database/postgres.cjs');
  const { randomUUID } = await import('node:crypto');
  const config = pg.connectionConfig();
  if (
    !['127.0.0.1', 'localhost', '::1'].includes(config.host ?? '') ||
    config.database !== 'lasmunecasderamon'
  )
    throw new Error('Las regresiones requieren la base local de desarrollo');
  state.pool = new Pool({
    ...config,
    max: 6,
    options: `-c search_path=${state.schema},public -c statement_timeout=10000`
  });
  const query = async (sql: string, params: unknown[] = []) =>
    (await state.pool.query(pg.prepareQuery(sql, params))).rows;
  return {
    query,
    generateUUID: randomUUID,
    default: {
      get pool() {
        return state.pool;
      }
    },
    withTransaction: async (fn: any) => {
      const client = await state.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(
          async (sql: string, params: unknown[] = []) =>
            (await client.query(pg.prepareQuery(sql, params))).rows
        );
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  };
});
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
vi.mock('@/modules/comunicaciones', () => ({
  enviarWhatsApp: vi.fn().mockResolvedValue(true),
  sendPushNotification: vi.fn().mockResolvedValue([]),
  sendPushByRole: vi.fn().mockResolvedValue([])
}));
vi.mock('@/lib/business/shotAlerts', () => ({ notifyBarShotAlerts: vi.fn() }));
import { query } from '@/lib/database/db';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { obtenerEstadoSesionToken, revocarSesionesUsuario } from '@/modules/identidad';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken
} from '@/lib/auth/auth';
import { insertarMarcaSiFalta } from '@/modules/asistencia/marcas/marcaUnicaRepositorio';
import { WithdrawalService } from '@/modules/caja/retiros/servicio';
import { otorgarAnticipo } from '@/modules/personal/anticipos/servicio';
import { getAnticipoBalances } from '@/modules/personal/balances/repositorio';
import { PayrollRepository } from '@/modules/personal/nomina/repositorio';
import { registrarHoraExtra } from '@/modules/personal/horas-extras/servicio';
import { UserService } from '@/modules/identidad/usuarios/fachada';
import { cambiarEstadoUnidades } from '@/modules/inventario/unidades/infraestructura';
import { NotificationRepository } from '@/modules/comunicaciones/notificaciones/repositorio';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { getCommissionsReport } from '@/modules/reportes/informes/comisiones';
import { StatsQueries } from '@/modules/reportes/dashboard/consultas';
import { actualizarServicioCasoUso } from '@/modules/operacion/servicios/creacion';
import { leerPrepagoConsumidoPorVenta, restituirPrepagoPorAnulacion } from '@/modules/clientes';
import { consumirPrepagoCuenta } from '@/modules/clientes/prepago/servicio';
import { revertirStockAnulacion } from '@/modules/inventario/anulaciones/infraestructura';

let user: string;
const q = (id: string) => '"' + id.replaceAll('"', '""') + '"';
beforeAll(async () => {
  const { Client } = await import('pg');
  const { default: pg } = await import('@/lib/database/postgres.cjs');
  const control = new Client({ ...pg.connectionConfig(), options: '-c search_path=public' });
  await control.connect();
  try {
    state.tables = (
      await control.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
      )
    ).rows.map(r => r.tablename);
    const fks = (
      await control.query(
        "SELECT conrelid::regclass::text AS tablename, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace"
      )
    ).rows;
    await control.query(`CREATE SCHEMA ${q(state.schema)}`);
    for (const table of state.tables)
      await control.query(
        `CREATE TABLE ${q(state.schema)}.${q(table)} (LIKE public.${q(table)} INCLUDING ALL)`
      );
    await state.pool.query(`CREATE SEQUENCE ${q(state.schema)}.inventario_sku_seq`);
    for (const fk of fks)
      await state.pool.query(
        `ALTER TABLE ${q(fk.tablename)} ADD CONSTRAINT ${q(fk.conname)} ${fk.definition}`
      );
  } finally {
    await control.end();
  }
});
beforeEach(async () => {
  await state.pool.query(
    `TRUNCATE ${state.tables.map(t => q(state.schema) + '.' + q(t)).join(',')} CASCADE`
  );
  const role = randomUUID();
  user = randomUUID();
  await query(
    `INSERT INTO roles (id_rol,nombre,descripcion,estado,fecha_crea) VALUES (?, ?, '', 1, now())`,
    [role, 'anfitriona']
  );
  await query(
    `INSERT INTO usuarios (id_usuario,run,nick,nombre,apellido,direccion,telefono,estado_civil,afp,aporte,sueldo,descuento,password,rol_id,estado,estado_servicio,force_password_change,fecha_crea)
    VALUES (?,?,'Prueba','Prueba','Regresion','','','','',0,100000,0,'hash',?,1,0,0,now())`,
    [user, user, role]
  );
});
afterAll(async () => {
  if (!/^test_review_[a-z0-9_]+$/.test(state.schema)) throw new Error('Esquema de prueba inválido');
  try {
    await state.pool.query(`DROP SCHEMA ${q(state.schema)} CASCADE`);
  } finally {
    await state.pool.end();
  }
});
async function caja(estado = 1, monto = 100) {
  const id = randomUUID();
  await query(
    'INSERT INTO cajas (id_caja,fecha_apertura,usuario_id_apertura,monto_apertura,monto_cierre,efectivo,tarjeta,transferencia,estado) VALUES (?,now(),?,?,0,0,0,0,?)',
    [id, user, monto, estado]
  );
  return id;
}
async function asistencia() {
  await insertarMarcaSiFalta(query, {
    id_asistencia: randomUUID(),
    usuario_id: user,
    fecha: '2026-10-16',
    hora: '21:00:00',
    estado: 1
  });
}

it('revoca access y refresh inmediatamente; desactivar o cambiar el rol también los invalida', async () => {
  const current = (await obtenerEstadoSesionToken(user))!;
  const data = { ...current, nick: current.nick ?? undefined };
  const access = await generateAccessToken(data),
    refresh = await generateRefreshToken(data);
  expect(await verifyToken(access)).not.toBeNull();
  expect(await verifyRefreshToken(refresh)).not.toBeNull();
  await revocarSesionesUsuario(user);
  expect(await verifyToken(access)).toBeNull();
  expect(await verifyRefreshToken(refresh)).toBeNull();
  const next = await generateAccessToken(data);
  const changedRole = randomUUID();
  await query(
    "INSERT INTO roles (id_rol,nombre,descripcion,estado,fecha_crea) VALUES (?,'cajero','',1,now())",
    [changedRole]
  );
  await query('UPDATE usuarios SET rol_id=? WHERE id_usuario=?', [changedRole, user]);
  expect(await verifyToken(next)).toBeNull();
  const currentToken = await generateAccessToken(data);
  expect(await verifyToken(currentToken)).toMatchObject({ role: 'cajero' });
  await query('UPDATE usuarios SET estado=0 WHERE id_usuario=?', [user]);
  expect(await verifyToken(currentToken)).toBeNull();
});
it('editar con el mismo RUN conserva la contraseña y el indicador de cambio obligatorio', async () => {
  await UserService.updateUser(user, { id: user, run: user, name: 'Editado' });
  expect(
    (
      await query('SELECT password,force_password_change FROM usuarios WHERE id_usuario=?', [user])
    )[0]
  ).toMatchObject({ password: 'hash', force_password_change: 0 });
});
it('dos marcas concurrentes del mismo día generan una sola asistencia', async () => {
  const mark = () =>
    insertarMarcaSiFalta(query, {
      id_asistencia: randomUUID(),
      usuario_id: user,
      fecha: '2026-10-16',
      hora: '21:00:00',
      estado: 1
    });
  expect((await Promise.all([mark(), mark()])).sort()).toEqual([false, true]);
  expect((await query('SELECT count(*)::int AS n FROM asistencias'))[0].n).toBe(1);
});
it('rechaza retiros de cajas cerradas sin escribir un movimiento', async () => {
  const id = await caja(0, 1000);
  await expect(
    WithdrawalService.addRetiro({ caja_id: id, usuario_id: user, monto: 100, motivo: 'Prueba' })
  ).rejects.toThrow('no esta abierta');
  expect((await query('SELECT count(*)::int AS n FROM retiros_caja'))[0].n).toBe(0);
});
it('dos anticipos concurrentes no pueden consumir el mismo efectivo', async () => {
  const id = await caja();
  await asistencia();
  const result = await Promise.allSettled([
    otorgarAnticipo(user, 80, undefined, undefined, user),
    otorgarAnticipo(user, 80, undefined, undefined, user)
  ]);
  expect(result.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect((await query('SELECT efectivo FROM cajas WHERE id_caja=?', [id]))[0].efectivo).toBe(-80);
});
it('los anticipos anulados no reducen nómina ni el máximo disponible', async () => {
  await asistencia();
  await query(
    'INSERT INTO anticipos (id_anticipo,usuario_id,monto,motivo,estado,fecha_crea) VALUES (?,?,5000,?,0,now())',
    [randomUUID(), user, 'Anulado']
  );
  expect((await getAnticipoBalances(user)).montoMaximo).toBe(100000);
  expect((await PayrollRepository.getSummary())[0].total).toBe(100000);
});
it('rechaza horas extras de tarifa negativa antes de persistir', async () => {
  await expect(registrarHoraExtra({ usuario_id: user, hora: 2, monto: -10 })).rejects.toThrow();
  expect((await query('SELECT count(*)::int AS n FROM horas_extras'))[0].n).toBe(0);
});
it('la campana, pendientes e historial respetan el rol del destinatario', async () => {
  await query(
    `INSERT INTO notificaciones (id,rol_destinatario,tipo,titulo,mensaje,leida,fecha_crea) VALUES (?, 'cajero','test','Caja','No corresponde',0,now()),(?, 'anfitriona','test','Personal','Corresponde',0,now())`,
    [randomUUID(), randomUUID()]
  );
  expect(await NotificationRepository.getPendingCount(user)).toBe(1);
  expect(await NotificationRepository.getPending(user)).toHaveLength(1);
  expect(await NotificationRepository.getHistory(user)).toHaveLength(1);
});
it('un consumo prepago de cuenta queda asociado a la venta y las restituciones reducen lo pendiente', async () => {
  const client = randomUUID(),
    sale = randomUUID();
  await query(
    "INSERT INTO clientes (id_cliente,nombre,apellido,saldo,fecha_crea) VALUES (?,'Prueba','Cliente',100,now())",
    [client]
  );
  await enUnaUnidad(u =>
    u.ejecutar(async ctx => {
      await consumirPrepagoCuenta(client, 100, ctx, {
        cuentaId: 'cuenta-prueba',
        ventaId: sale,
        usuarioId: user
      });
      expect(await leerPrepagoConsumidoPorVenta(client, sale, ctx)).toBe(100);
      await restituirPrepagoPorAnulacion(
        { clienteId: client, ventaId: sale, monto: 20, usuarioId: user, concepto: 'Parcial' },
        ctx
      );
      expect(await leerPrepagoConsumidoPorVenta(client, sale, ctx)).toBe(80);
      await restituirPrepagoPorAnulacion(
        {
          clienteId: client,
          ventaId: sale,
          monto: 80,
          usuarioId: user,
          concepto: 'Total restante'
        },
        ctx
      );
      expect(await leerPrepagoConsumidoPorVenta(client, sale, ctx)).toBe(0);
    })
  );
  expect((await query('SELECT saldo FROM clientes WHERE id_cliente=?', [client]))[0].saldo).toBe(
    100
  );
});
it('resta el retiro una sola vez en el resumen general', async () => {
  const id = await caja(1, 100);
  await WithdrawalService.addRetiro({ caja_id: id, usuario_id: user, monto: 20, motivo: 'Prueba' });
  expect((await StatsQueries.getCajaGeneralStats()).balance_total).toBe(80);
});
it('restaura limpieza con saldos y movimientos sin romper referencias', async () => {
  const id = randomUUID();
  await query(
    "INSERT INTO limpieza_articulos (id,nombre,unidad,minimo,creado_por) VALUES (?,'Prueba','unidad',0,?)",
    [id, user]
  );
  await query(
    "INSERT INTO limpieza_stock (articulo_id,ubicacion,cantidad) VALUES (?,'almacen',2)",
    [id]
  );
  const snap = await snapshotDatabase();
  await restoreDatabase(snap, 'prueba');
  expect(
    (await query('SELECT cantidad FROM limpieza_stock WHERE articulo_id=?', [id]))[0].cantidad
  ).toBe(2);
});

async function producto() {
  const id = randomUUID();
  await query(
    "INSERT INTO productos (id_producto,codigo,nombre,precio,comision,fecha_crea) VALUES (?,?, 'Producto de prueba',100,0,now())",
    [id, id.slice(0, 12)]
  );
  return id;
}
async function venta(total = 100, estado = 1, cliente: string | null = null) {
  const id = randomUUID();
  await query(
    `INSERT INTO ventas (id_venta,codigo,cliente_id,sub_total,total,total_comision,propina,tiempo,metodo_pago,created_by,fecha_crea,estado)
    VALUES (?,?, ?,?,?,0,0,0,'efectivo',?,now(),?)`,
    [id, id.slice(0, 20), cliente, total, total, user, estado]
  );
  return id;
}
it('conserva comisiones pagadas en el histórico y mantiene los identificadores UUID', async () => {
  const sale = await venta(),
    com = randomUUID();
  await query(
    'INSERT INTO comisiones (id_comision,venta_id,monto,estado,fecha_crea) VALUES (?,?,2000,1,now())',
    [com, sale]
  );
  await query(
    'INSERT INTO detalle_comisiones (id_detalle_comision,comision_id,usuario_id,comision,estado,fecha_crea) VALUES (?,?,?,2000,0,now())',
    [randomUUID(), com, user]
  );
  expect((await getAnticipoBalances(user)).montoComision).toBe(0);
  const result = await getCommissionsReport('current_month');
  expect(result.commissions).toMatchObject([{ id_usuario: user, total_comisiones: 2000 }]);
});
it('rechaza códigos de otro producto sin modificar ninguna unidad', async () => {
  const a = await producto(),
    b = await producto(),
    unit = randomUUID();
  await query(
    "INSERT INTO inventario_unidades (id,producto_id,codigo,ubicacion,estado) VALUES (?,?,?,'almacen','almacen')",
    [unit, b, unit.slice(0, 12)]
  );
  await expect(cambiarEstadoUnidades(a, [unit], 'inactivo')).rejects.toThrow('pertenecer');
  expect((await query('SELECT estado FROM inventario_unidades WHERE id=?', [unit]))[0].estado).toBe(
    'almacen'
  );
});
it('las parciales sucesivas reponen la fracción de ml restante, sin exceso', async () => {
  const product = await producto(),
    pres = randomUUID(),
    unit = randomUUID(),
    move = randomUUID(),
    sale = await venta();
  await query(
    "INSERT INTO inventario_presentaciones (id,producto_id,nombre,ml_botella) VALUES (?,?,'1000 ml',1000)",
    [pres, product]
  );
  await query(
    "INSERT INTO inventario_unidades (id,producto_id,presentacion_id,codigo,ubicacion,estado,ml_restante) VALUES (?,?,?,?,'bar','vendida',0)",
    [unit, product, pres, unit.slice(0, 12)]
  );
  await query(
    "INSERT INTO inventario_movimientos (id,tipo,estado,producto_id,presentacion_id,cantidad,ml,usuario_id,venta_id,fecha_crea) VALUES (?,'venta','completada',?,?,0,1000,?,?,now())",
    [move, product, pres, user, sale]
  );
  await query(
    'INSERT INTO inventario_movimiento_unidades (movimiento_id,unidad_id,ml_consumido) VALUES (?,?,1000)',
    [move, unit]
  );
  await revertirStockAnulacion({
    venta_id: sale,
    usuario_id: user,
    fecha: '2026-10-16 21:00:00',
    fraccion: 0.2
  });
  await revertirStockAnulacion({
    venta_id: sale,
    usuario_id: user,
    fecha: '2026-10-16 21:00:00',
    fraccion: 0.25
  });
  expect(
    (await query('SELECT ml_restante FROM inventario_unidades WHERE id=?', [unit]))[0].ml_restante
  ).toBe(400);
});
it('los importes cobrados de servicios no pueden editarse y no afectan otra caja', async () => {
  const id = randomUUID();
  await query(
    `INSERT INTO servicios (id_servicio,codigo,precio_habitacion,precio_servicio,sub_total,total,tiempo,metodo_pago,fecha_crea,estado)
    VALUES (?, ?, 0,100,100,100,60,'efectivo',now(),2)`,
    [id, id]
  );
  await expect(actualizarServicioCasoUso(id, { total: 200 })).rejects.toThrow('ya está cobrado');
  expect((await query('SELECT total FROM servicios WHERE id_servicio=?', [id]))[0].total).toBe(100);
  await actualizarServicioCasoUso(id, { tiempo: 90 });
  expect((await query('SELECT tiempo FROM servicios WHERE id_servicio=?', [id]))[0].tiempo).toBe(
    90
  );
});

async function cuenta(cliente: string, conDetalle = true) {
  const id = randomUUID();
  await query(
    `INSERT INTO cuentas (id_cuenta,codigo,cliente_id,sub_total,total,total_comision,estado,fecha_crea)
    VALUES (?, ?, ?,100,100,0,1,now())`,
    [id, id.slice(0, 12), cliente]
  );
  if (conDetalle) {
    const product = await producto();
    await query(
      `INSERT INTO detalle_cuentas (id_detalle_cuenta,cuenta_id,producto_id,precio,cantidad,sub_total,comision,fecha_crea)
      VALUES (?,?,?,100,1,100,0,now())`,
      [randomUUID(), id, product]
    );
  }
  return id;
}
it.each(['efectivo', 'prepago'])(
  'el cobro atómico %s registra una venta y aplica el dinero una sola vez',
  async metodo => {
    const client = randomUUID(),
      cash = await caja();
    await query(
      "INSERT INTO clientes (id_cliente,nombre,apellido,saldo,fecha_crea) VALUES (?,'Prueba','Cliente',200,now())",
      [client]
    );
    const account = await cuenta(client);
    await cobrarCuentaConVenta(
      account,
      { montoFinal: 100, tipoPago: metodo, propinaFinal: 0 },
      user
    );
    const [sale] = await query('SELECT id_venta,total FROM ventas');
    expect(sale.total).toBe(100);
    expect(await query('SELECT id_venta FROM ventas')).toHaveLength(1);
    expect(
      (await query('SELECT venta,efectivo,prepago FROM cajas WHERE id_caja=?', [cash]))[0]
    ).toMatchObject({
      venta: 100,
      efectivo: metodo === 'efectivo' ? 100 : 0,
      prepago: metodo === 'prepago' ? 100 : 0
    });
    expect((await query('SELECT saldo FROM clientes WHERE id_cliente=?', [client]))[0].saldo).toBe(
      metodo === 'prepago' ? 100 : 200
    );
    await expect(
      cobrarCuentaConVenta(account, { montoFinal: 100, tipoPago: metodo }, user)
    ).rejects.toThrow('ya fue procesada');
    if (metodo === 'prepago') {
      await enUnaUnidad(u =>
        u.ejecutar(ctx => anularVentaTotalEnUnidad(sale.id_venta, user, ctx, () => {}))
      );
      expect(
        (await query('SELECT saldo FROM clientes WHERE id_cliente=?', [client]))[0].saldo
      ).toBe(200);
    }
  }
);
it('si no puede crear la venta, el cobro revierte cuenta, saldo prepago y caja', async () => {
  const client = randomUUID(),
    cash = await caja();
  await query(
    "INSERT INTO clientes (id_cliente,nombre,apellido,saldo,fecha_crea) VALUES (?,'Prueba','Cliente',200,now())",
    [client]
  );
  const account = await cuenta(client, false);
  await expect(
    cobrarCuentaConVenta(account, { montoFinal: 100, tipoPago: 'prepago' }, user)
  ).rejects.toThrow('no tiene productos');
  expect((await query('SELECT estado FROM cuentas WHERE id_cuenta=?', [account]))[0].estado).toBe(
    1
  );
  expect((await query('SELECT saldo FROM clientes WHERE id_cliente=?', [client]))[0].saldo).toBe(
    200
  );
  expect((await query('SELECT venta,prepago FROM cajas WHERE id_caja=?', [cash]))[0]).toMatchObject(
    { venta: 0, prepago: 0 }
  );
  expect(await query('SELECT id_movimiento FROM clientes_prepago_movimientos')).toHaveLength(0);
});
it('dos anulaciones simultáneas devuelven el dinero una sola vez', async () => {
  const cash = await caja(),
    sale = await venta();
  await query('UPDATE ventas SET caja_id=? WHERE id_venta=?', [cash, sale]);
  await query('UPDATE cajas SET efectivo=100,venta=100 WHERE id_caja=?', [cash]);
  const cancel = () =>
    enUnaUnidad(u => u.ejecutar(ctx => anularVentaTotalEnUnidad(sale, user, ctx, () => {})));
  await Promise.all([cancel(), cancel()]);
  await enUnaUnidad(u =>
    u.ejecutar(ctx => anularVentaParcialEnUnidad(sale, user, 20, ctx, () => {}))
  );
  expect(
    (await query('SELECT efectivo,venta,devolucion FROM cajas WHERE id_caja=?', [cash]))[0]
  ).toMatchObject({ efectivo: 0, venta: 0, devolucion: 100 });
  expect(await query('SELECT id_devolucion_venta FROM devoluciones_ventas')).toHaveLength(1);
  const [row] = await query('SELECT * FROM cajas WHERE id_caja=?', [cash]);
  expect(totalCaja(row)).toBe(100);
  expect((await StatsQueries.getCajaGeneralStats()).balance_total).toBe(100);
});

it('el historial incluye ventas activas y no duplica su movimiento prepago', async () => {
  const client = randomUUID();
  await query(
    "INSERT INTO clientes (id_cliente,nombre,apellido,saldo,fecha_crea) VALUES (?,'Prueba','Cliente',200,now())",
    [client]
  );
  const sale = await venta(100, 2, client);
  await enUnaUnidad(u =>
    u.ejecutar(ctx =>
      consumirPrepagoCuenta(client, 100, ctx, {
        cuentaId: 'cuenta-prueba',
        ventaId: sale,
        usuarioId: user
      })
    )
  );
  const history = await obtenerHistorial(client);
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ id: sale, monto: 100, category: 'CONSUMO' });
});

it('la agenda y el máximo de anticipo usan el detalle pagado de la propina', async () => {
  const sale = await venta(),
    tip = randomUUID(),
    detail = randomUUID();
  await query(
    'INSERT INTO propinas (id_propina,venta_id,propina,estado,fecha_crea) VALUES (?,?,100,1,now())',
    [tip, sale]
  );
  await query(
    'INSERT INTO detalle_propinas (id_detalle_propina,propina_id,usuario_id,monto,estado,fecha_crea) VALUES (?,?,?,100,0,now())',
    [detail, tip, user]
  );
  const events: Array<{ type: string; id: string; estado: number }> =
    await EventQueries.getUserEvents(user);
  expect(events.find(event => event.type === 'propina')).toMatchObject({ id: detail, estado: 0 });
  expect((await getAnticipoBalances(user)).montoPropina).toBe(0);
});

it('los reportes de barra, champaña y tragos excluyen las ventas anuladas', async () => {
  const cash = await caja(),
    product = await producto(),
    champagne = await producto();
  await query("UPDATE productos SET nombre='Champagne de prueba' WHERE id_producto=?", [champagne]);
  for (const [prod, commission, status] of [
    [product, false, 1],
    [product, false, 0],
    [champagne, false, 0],
    [product, true, 0]
  ] as const) {
    const sale = await venta(100, status);
    await query('UPDATE ventas SET caja_id=? WHERE id_venta=?', [cash, sale]);
    await query(
      'INSERT INTO detalle_ventas (id_detalle_venta,venta_id,producto_id,precio,cantidad,sub_total,comision,fecha_crea) VALUES (?,?,?,100,1,100,0,now())',
      [randomUUID(), sale, prod]
    );
    if (commission)
      await query(
        'INSERT INTO comisiones (id_comision,venta_id,monto,estado,fecha_crea) VALUES (?,?,10,1,now())',
        [randomUUID(), sale]
      );
  }
  expect((await VentasStatsRepository.getVentasBarras(cash)).total_venta).toBe(100);
  expect((await VentasStatsRepository.getVentasChampagne(cash)).total_venta).toBe(0);
  expect((await VentasStatsRepository.getVentasTragosChicas(cash)).total_venta).toBe(0);
});

it.each(['prepago', 'mixto'])(
  'dos parciales y una anulación total %s restituyen exactamente lo consumido',
  async metodo => {
    const client = randomUUID(),
      cash = await caja();
    await query(
      "INSERT INTO clientes (id_cliente,nombre,apellido,saldo,fecha_crea) VALUES (?,'Prueba','Cliente',200,now())",
      [client]
    );
    const sale = await venta(100, 1, client),
      prepaid = metodo === 'mixto' ? 60 : 100;
    await query('UPDATE ventas SET caja_id=?,metodo_pago=?,pagos_mixtos=? WHERE id_venta=?', [
      cash,
      metodo,
      metodo === 'mixto'
        ? JSON.stringify([
            { metodo: 'prepago', monto: 60 },
            { metodo: 'efectivo', monto: 40 }
          ])
        : null,
      sale
    ]);
    await query('UPDATE cajas SET venta=100,efectivo=?,prepago=? WHERE id_caja=?', [
      100 - prepaid,
      prepaid,
      cash
    ]);
    await enUnaUnidad(u =>
      u.ejecutar(ctx =>
        consumirPrepagoCuenta(client, prepaid, ctx, {
          cuentaId: 'prueba',
          ventaId: sale,
          usuarioId: user
        })
      )
    );
    for (let index = 0; index < 2; index++) {
      await enUnaUnidad(u =>
        u.ejecutar(ctx => anularVentaParcialEnUnidad(sale, user, 20, ctx, () => {}))
      );
    }
    expect((await query('SELECT total FROM ventas WHERE id_venta=?', [sale]))[0].total).toBe(60);
    if (metodo === 'mixto') {
      const [current] = await query('SELECT pagos_mixtos FROM ventas WHERE id_venta=?', [sale]);
      const payments =
        typeof current.pagos_mixtos === 'string'
          ? JSON.parse(current.pagos_mixtos)
          : current.pagos_mixtos;
      expect(payments).toEqual([
        { metodo: 'prepago', monto: 36 },
        { metodo: 'efectivo', monto: 24 }
      ]);
    }
    expect((await query('SELECT saldo FROM clientes WHERE id_cliente=?', [client]))[0].saldo).toBe(
      200 - prepaid * 0.6
    );
    expect(
      (await query('SELECT efectivo,prepago FROM cajas WHERE id_caja=?', [cash]))[0]
    ).toMatchObject({ efectivo: (100 - prepaid) * 0.6, prepago: prepaid * 0.6 });
    await enUnaUnidad(u => u.ejecutar(ctx => anularVentaTotalEnUnidad(sale, user, ctx, () => {})));
    expect((await query('SELECT saldo FROM clientes WHERE id_cliente=?', [client]))[0].saldo).toBe(
      200
    );
    expect(
      (await query('SELECT efectivo,prepago,devolucion FROM cajas WHERE id_caja=?', [cash]))[0]
    ).toMatchObject({ efectivo: 0, prepago: 0, devolucion: 100 });
    expect((await StatsQueries.getCajaGeneralStats()).balance_total).toBe(100);
  }
);
