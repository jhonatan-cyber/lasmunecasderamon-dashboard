import { afterAll, expect, it } from 'vitest';

import db, { query } from '@/lib/database/db';
import { restoreDatabase, snapshotDatabase } from '@/lib/database/maintenance';
import { CATEGORIA_BEBIDAS_ANALCOHOLICAS } from '@/lib/business/colacionRoles';
import { listarColaciones, registrarColacion } from '@/modules/colaciones';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_VENDIDA } from '@/modules/inventario/estados';
import { listarMovimientosRecientes, obtenerResumenShots } from '@/modules/inventario';

/**
 * Flujo real de colaciones contra PostgreSQL: una anfitriona y un garzón
 * registran su bebida del turno y quedan persistidas en `colaciones`.
 *
 * La regla rol → catálogo se valida en el servidor (`lib/business/colacionRoles`),
 * así que la prueba también comprueba que el garzón no puede llevarse un licor
 * aunque la presentación esté habilitada para colación.
 */

// `usuarios` queda fuera del snapshot/restore de mantenimiento: si la base no
// trae trabajadores con el rol, se crean aquí y se eliminan al terminar.
const usuariosCreados: string[] = [];

afterAll(async () => {
  for (const id of usuariosCreados) await query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

interface Trabajador {
  id: string;
  nombre: string;
  apellido: string;
}

interface Bebida {
  productoId: string;
  presentacionId: string;
  nombre: string;
}

async function trabajadorConRol(rol: 'Anfitriona' | 'Garzon'): Promise<Trabajador> {
  const [existente] = await query<Trabajador[]>(
    `SELECT u.id_usuario AS id, u.nombre, u.apellido
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.rol_id
      WHERE LOWER(r.nombre) = ? AND u.estado = 1
      ORDER BY u.fecha_crea ASC
      LIMIT 1`,
    [rol.toLowerCase()]
  );
  if (existente) return existente;

  const [filaRol] = await query<{ id_rol: string }[]>(
    'SELECT id_rol FROM roles WHERE LOWER(nombre) = ? LIMIT 1',
    [rol.toLowerCase()]
  );
  const [admin] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
  if (!filaRol || !admin) throw new Error(`La base de pruebas no tiene rol ${rol} ni usuarios`);

  const id = crypto.randomUUID();
  await query(
    `INSERT INTO usuarios
       (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil, afp,
        aporte, sueldo, password, rol_id, estado, estado_servicio, fecha_crea)
     SELECT ?, ?, ?, 'Fixture', ?, 'Fixture', '000000000', 'Fixture', 'Fixture',
            5000, 50000, password, ?, 1, 0, now()
       FROM usuarios WHERE id_usuario = ?`,
    [
      id,
      `COL-${id.slice(0, 8)}`,
      `Col-${rol}-${id.slice(0, 4)}`,
      rol,
      filaRol.id_rol,
      admin.id_usuario
    ]
  );
  usuariosCreados.push(id);
  return { id, nombre: 'Fixture', apellido: rol };
}

async function primerUsuarioActivo(): Promise<string> {
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios WHERE estado = 1 ORDER BY fecha_crea ASC LIMIT 1'
  );
  if (!usuario) throw new Error('La base de pruebas no tiene usuarios activos');
  return usuario.id_usuario;
}

/**
 * Caja propia del caso: se crea una siempre, sin reusar la caja abierta real.
 * El caso necesita una caja sin colaciones previas para el trabajador.
 */
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

/**
 * Bebida con una presentación habilitada para colación y una unidad en el bar.
 * `categoriaId` null deja el producto sin categoría (licor para la anfitriona);
 * el garzón necesita la categoría protegida de bebidas analcohólicas.
 *
 * `mlColacion` es la configuración real de la bebida: los ml de la colación los
 * calcula el servidor desde ahí, no desde lo que declare quien la registra.
 */
async function crearBebida(
  nombre: string,
  categoriaId: string | null,
  acompanamiento = false,
  presentacionNombre = '750 ml',
  acompanamientoColacion?: { unidades: number; ml?: number },
  mlColacion?: number
): Promise<Bebida> {
  const productoId = crypto.randomUUID();
  const presentacionId = crypto.randomUUID();
  const codigo = `COL${productoId.slice(0, 8)}`;
  const opcion = {
    tipo: 'botella',
    precio: 30000,
    comision: 0,
    colacion_habilitada: true,
    ...(mlColacion !== undefined ? { ml_colacion: mlColacion } : {}),
    ...(acompanamiento ? { acompanamiento: { unidades: 1, nombre: 'Gaseosa' } } : {}),
    ...(acompanamientoColacion ? { acompanamiento_colacion: acompanamientoColacion } : {})
  };

  await query(
    `INSERT INTO productos
       (id_producto, codigo, nombre, categoria_id, precio, comision, fecha_crea)
     VALUES (?, ?, ?, ?, 30000, 0, now())`,
    [productoId, codigo, nombre, categoriaId]
  );
  await query(
    `INSERT INTO inventario_presentaciones
       (id, producto_id, nombre, precio_venta, comision, ml_botella, opciones_venta)
     VALUES (?, ?, ?, 30000, 0, 750, ?::jsonb)`,
    [presentacionId, productoId, presentacionNombre, JSON.stringify([opcion])]
  );
  await query(
    `INSERT INTO inventario_unidades
       (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea)
     VALUES (?, ?, ?, ?, 'bar', ?, now())`,
    [crypto.randomUUID(), productoId, presentacionId, `${codigo}U`, ESTADO_UNIDAD_ACTIVA]
  );

  return { productoId, presentacionId, nombre };
}

async function categoriaAnalcoholica(): Promise<string> {
  const [categoria] = await query<{ id_categoria: string }[]>(
    'SELECT id_categoria FROM categorias WHERE system_key = ? LIMIT 1',
    [CATEGORIA_BEBIDAS_ANALCOHOLICAS]
  );
  if (!categoria)
    throw new Error(`La base de pruebas no tiene la categoría ${CATEGORIA_BEBIDAS_ANALCOHOLICAS}`);
  return categoria.id_categoria;
}

it('registra la colación de una anfitriona con una bebida habilitada', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const anfitriona = await trabajadorConRol('Anfitriona');
    const registrador = await primerUsuarioActivo();
    const resumenBase = await obtenerResumenShots();
    const bebida = await crearBebida('Whisky de prueba', null, true, '750 ml', undefined, 150);
    const mezclador = await crearBebida(
      'Coca-Cola de prueba',
      await categoriaAnalcoholica(),
      false,
      '1.5 L'
    );

    const resultado = await registrarColacion({
      usuarioId: anfitriona.id,
      presentacionId: bebida.presentacionId,
      acompanamiento: null,
      acompanamientoPresentacionId: mezclador.presentacionId,
      registradoPor: registrador
    });

    expect(resultado.caja_id).toBe(cajaId);
    expect(resultado.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const [fila] = await query<Record<string, unknown>[]>(
      `SELECT usuario_id, presentacion_id, nombre_bebida, ml_bebida, acompanamiento,
              acompanamiento_presentacion_id, caja_id, registrado_por, fecha
         FROM colaciones WHERE id = ?`,
      [resultado.id]
    );
    expect(fila).toMatchObject({
      usuario_id: anfitriona.id,
      presentacion_id: bebida.presentacionId,
      nombre_bebida: 'Whisky de prueba 750 ml',
      acompanamiento: null,
      acompanamiento_presentacion_id: mezclador.presentacionId,
      caja_id: cajaId,
      registrado_por: registrador,
      fecha: resultado.fecha
    });
    expect(Number(fila.ml_bebida)).toBe(150);

    // El listado del turno une al trabajador y a quien registró.
    const delTurno = await listarColaciones(resultado.fecha, cajaId);
    const registro = delTurno.find(colacion => colacion.id === resultado.id);
    expect(registro).toMatchObject({
      usuario_id: anfitriona.id,
      presentacion_id: bebida.presentacionId,
      ml_bebida: 150,
      acompanamiento: null,
      acompanamiento_presentacion_id: mezclador.presentacionId,
      acompanamiento_nombre: 'Coca-Cola de prueba 1.5 L',
      caja_id: cajaId,
      registrado_por: registrador
    });
    expect(registro?.trabajador).toContain(anfitriona.nombre);
    expect(registro?.registrado_por_nombre).toBeTruthy();

    // La colación descuenta del bar: abre la botella de la bebida y deja los ml
    // servidos fuera de ella, y el acompañamiento incluido sale como unidad.
    const [unidadBebida] = await query<
      {
        estado: string;
        ml_restante: number;
        abierta_por_shots: boolean;
      }[]
    >(
      'SELECT estado, ml_restante, abierta_por_shots FROM inventario_unidades WHERE presentacion_id = ?',
      [bebida.presentacionId]
    );
    expect(unidadBebida).toMatchObject({ estado: ESTADO_UNIDAD_ACTIVA, abierta_por_shots: true });
    expect(Number(unidadBebida.ml_restante)).toBe(600); // 750 de la botella − 150 servidos

    const [movimientoBebida] = await query<
      { tipo: string; cantidad: number; precio_venta: number; ml: number; usuario_id: string }[]
    >(
      `SELECT tipo, cantidad, precio_venta, ml, usuario_id
         FROM inventario_movimientos WHERE presentacion_id = ? AND tipo = 'colacion'`,
      [bebida.presentacionId]
    );
    expect(movimientoBebida).toMatchObject({
      tipo: 'colacion',
      cantidad: 0,
      precio_venta: 0,
      usuario_id: registrador
    });
    expect(Number(movimientoBebida.ml)).toBe(150);

    const [unidadAcompanamiento] = await query<{ estado: string; ml_restante: number }[]>(
      'SELECT estado, ml_restante FROM inventario_unidades WHERE presentacion_id = ?',
      [mezclador.presentacionId]
    );
    expect(unidadAcompanamiento).toMatchObject({ estado: ESTADO_UNIDAD_VENDIDA });
    expect(Number(unidadAcompanamiento.ml_restante)).toBe(0);

    // El historial del bar expone el detalle por botella de la colación.
    const historial = await listarMovimientosRecientes(200);
    const enHistorial = historial.find(
      movimiento =>
        movimiento.tipo === 'colacion' && movimiento.presentacion_id === bebida.presentacionId
    );
    expect(enHistorial?.unidades_consumidas).toEqual([
      expect.objectContaining({ ml_consumido: 150, codigo: expect.any(String) })
    ]);

    // El resumen del turno suma los ml de la colación (bebida + acompañamiento)
    // pero no la cuenta como corto vendido.
    const resumen = await obtenerResumenShots();
    // El Acompañamiento se entregó por una unidad entera: sus 750 ml también
    // salieron del bar y cuentan en el resumen del turno.
    expect(resumen.mlServidosHoy - resumenBase.mlServidosHoy).toBe(900);
    expect(resumen.mlColacionHoy - resumenBase.mlColacionHoy).toBe(900);
    expect(resumen.shotsServidosHoy - resumenBase.shotsServidosHoy).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('registra la colación de un garzón con una bebida analcohólica', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const garzon = await trabajadorConRol('Garzon');
    const registrador = await primerUsuarioActivo();
    const bebida = await crearBebida(
      'Agua tónica de prueba',
      await categoriaAnalcoholica(),
      false,
      '750 ml',
      undefined,
      200
    );

    const resultado = await registrarColacion({
      usuarioId: garzon.id,
      presentacionId: bebida.presentacionId,
      acompanamiento: null,
      registradoPor: registrador
    });

    const [fila] = await query<Record<string, unknown>[]>(
      `SELECT usuario_id, presentacion_id, nombre_bebida, ml_bebida, acompanamiento, caja_id
         FROM colaciones WHERE id = ?`,
      [resultado.id]
    );
    expect(fila).toMatchObject({
      usuario_id: garzon.id,
      presentacion_id: bebida.presentacionId,
      nombre_bebida: 'Agua tónica de prueba 750 ml',
      acompanamiento: null,
      caja_id: cajaId
    });
    expect(Number(fila.ml_bebida)).toBe(200);

    // El garzón también descuenta ml: la botella quedó abierta con lo que resta.
    const [unidad] = await query<{ ml_restante: number; abierta_por_shots: boolean }[]>(
      'SELECT ml_restante, abierta_por_shots FROM inventario_unidades WHERE presentacion_id = ?',
      [bebida.presentacionId]
    );
    expect(unidad.abierta_por_shots).toBe(true);
    expect(Number(unidad.ml_restante)).toBe(550); // 750 − 200
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('descuenta los ml configurados del acompañamiento, no una unidad entera', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await cajaAbierta();
    const anfitriona = await trabajadorConRol('Anfitriona');
    const registrador = await primerUsuarioActivo();
    const bebida = await crearBebida(
      'Ron con mezclador',
      null,
      false,
      '750 ml',
      {
        unidades: 1,
        ml: 200
      },
      120
    );
    const mezclador = await crearBebida(
      'Soda de prueba',
      await categoriaAnalcoholica(),
      false,
      '750 ml'
    );

    await registrarColacion({
      usuarioId: anfitriona.id,
      presentacionId: bebida.presentacionId,
      acompanamiento: null,
      acompanamientoPresentacionId: mezclador.presentacionId,
      registradoPor: registrador
    });

    // El acompañamiento tenía 750 ml: salen 200 y queda abierto con 550.
    const [unidadAcompanamiento] = await query<
      { estado: string; ml_restante: number; abierta_por_shots: boolean }[]
    >(
      'SELECT estado, ml_restante, abierta_por_shots FROM inventario_unidades WHERE presentacion_id = ?',
      [mezclador.presentacionId]
    );
    expect(unidadAcompanamiento).toMatchObject({
      estado: ESTADO_UNIDAD_ACTIVA,
      abierta_por_shots: true
    });
    expect(Number(unidadAcompanamiento.ml_restante)).toBe(550);

    const [movimiento] = await query<{ ml: number }[]>(
      `SELECT ml FROM inventario_movimientos WHERE presentacion_id = ? AND tipo = 'colacion'`,
      [mezclador.presentacionId]
    );
    expect(Number(movimiento.ml)).toBe(200);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('rechaza un acompañamiento que no sea bebida analcohólica', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const anfitriona = await trabajadorConRol('Anfitriona');
    const registrador = await primerUsuarioActivo();
    const bebida = await crearBebida('Whisky con mezclador', null, true, '750 ml', undefined, 100);
    const otroLicor = await crearBebida('Licor acompañante', null);

    await expect(
      registrarColacion({
        usuarioId: anfitriona.id,
        presentacionId: bebida.presentacionId,
        acompanamiento: null,
        acompanamientoPresentacionId: otroLicor.presentacionId,
        registradoPor: registrador
      })
    ).rejects.toThrow('Selecciona una bebida analcohólica con stock en el bar como acompañamiento');

    const filas = await query<{ id: string }[]>(
      'SELECT id FROM colaciones WHERE usuario_id = ? AND caja_id = ?',
      [anfitriona.id, cajaId]
    );
    expect(filas).toHaveLength(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('rechaza el licor del garzón aunque esté habilitado para colación', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await cajaAbierta();
    const garzon = await trabajadorConRol('Garzon');
    const registrador = await primerUsuarioActivo();
    const licor = await crearBebida('Licor de prueba', null);

    await expect(
      registrarColacion({
        usuarioId: garzon.id,
        presentacionId: licor.presentacionId,
        acompanamiento: null,
        registradoPor: registrador
      })
    ).rejects.toThrow('Este rol solo recibe bebidas analcohólicas habilitadas para colación');

    const filas = await query<{ id: string }[]>(
      'SELECT id FROM colaciones WHERE usuario_id = ? AND presentacion_id = ?',
      [garzon.id, licor.presentacionId]
    );
    expect(filas).toHaveLength(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('rechaza una segunda colación del mismo trabajador en el mismo turno de caja', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const anfitriona = await trabajadorConRol('Anfitriona');
    const registrador = await primerUsuarioActivo();
    const bebida = await crearBebida('Bebida de prueba', null, false, '750 ml', undefined, 100);

    const input = {
      usuarioId: anfitriona.id,
      presentacionId: bebida.presentacionId,
      acompanamiento: null,
      registradoPor: registrador
    };
    await registrarColacion(input);

    await expect(registrarColacion(input)).rejects.toMatchObject({ code: 'CONFLICT' });

    const filas = await query<{ id: string }[]>(
      'SELECT id FROM colaciones WHERE usuario_id = ? AND caja_id = ?',
      [anfitriona.id, cajaId]
    );
    expect(filas).toHaveLength(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
