/**
 * Lecturas de solicitudes de anulación de cuentas. Infraestructura privada del
 * módulo: nadie fuera de `modules/operacion` importa este archivo (§5).
 *
 * Este SQL vivía dentro de tres rutas HTTP (`/api/cuentas/anulacion`,
 * `/api/cuentas/solicitud-anulacion` y `/api/cuentas/procesar-anulacion`), que
 * mezclaban adaptación, consulta y validación. Mismo SQL y misma selección que tenían
 * las rutas; el alta y el procesamiento siguen en `AccountService`.
 */
import { generateUUID, query } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { getNowInBusinessTimezone, parseBusinessDate } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { logger } from '@/lib/utils/logger';
import {
  parseRoomHistory,
  stringifyRoomHistory,
  getRemainingMinutes,
  ensureOpenHistorySegment,
  closeOpenHistorySegment
} from '@/lib/repositories/cuenta/CuentaRoomHistory';
import type { CuentaParaAnulacion, SolicitudAnulacionCuenta } from '../contracts';

/** La cuenta con su cliente resuelto; la ruta lo usa para el aviso de WhatsApp. */
export async function obtenerCuentaParaAnulacion(
  cuentaId: string
): Promise<CuentaParaAnulacion | null> {
  const rows = await query<CuentaParaAnulacion[]>(
    `SELECT c.codigo, c.total,
            COALESCE(cl.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM cuentas c
     LEFT JOIN clientes cl ON c.cliente_id = cl.id_cliente
     WHERE c.id_cuenta = ?
     LIMIT 1`,
    [cuentaId]
  );
  return rows[0] ?? null;
}

/**
 * Solicitud por identificador, sólo si sigue pendiente.
 *
 * Ojo al nombre del parámetro: estas rutas lo llaman `token` desde el cuerpo, pero
 * contra `cuentas` la columna que se busca es `sac.id`. Se conserva tal cual para no
 * cambiar el contrato HTTP.
 */
export async function obtenerSolicitudAnulacionCuenta(
  solicitudId: string
): Promise<SolicitudAnulacionCuenta[]> {
  return await query<SolicitudAnulacionCuenta[]>(
    `SELECT sac.id, sac.estado, sac.motivo, sac.monto, sac.fecha_crea,
            c.id_cuenta as cuenta_id, c.codigo, c.total,
            COALESCE(cl.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM solicitudes_anulacion_cuentas sac
     INNER JOIN cuentas c ON c.id_cuenta = sac.cuenta_id
     LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
     WHERE sac.id = ? AND sac.estado = 'pendiente'
     LIMIT 1`,
    [solicitudId]
  );
}

/**
 * Cuenta PREP-* automática de una recarga. Mismo SQL que
 * `ClientRepository.addPrepago`: la cuenta sólo visibiliza el saldo, no mueve
 * caja más allá de lo ya postulado. Si falla no bloquea la recarga.
 */
export async function crearCuentaPrepago(
  clienteId: string,
  monto: number,
  usuarioId: string | null,
  contexto: ContextoOperacion
): Promise<void> {
  try {
    const trx = resolverTransaccion(contexto);
    const now = getNowInBusinessTimezone();
    const cuentaId = generateUUID();
    const codigoPrepago = `PREP-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;
    await BaseRepository.insert(trx, 'cuentas', {
      id_cuenta: cuentaId,
      codigo: codigoPrepago,
      cliente_id: clienteId,
      total_comision: 0,
      habitacion_id: null,
      sub_total: monto,
      total: monto,
      propina: 0,
      fecha_crea: now,
      estado: 1,
      tiempo: 0,
      tiempo_actual: 0,
      tiempo_inicio_actual: null,
      habitaciones_historial: null,
      created_by: usuarioId
    });
    await BaseRepository.insert(trx, 'detalle_cuentas', {
      id_detalle_cuenta: generateUUID(),
      cuenta_id: cuentaId,
      producto_id: null,
      precio: monto,
      cantidad: 1,
      sub_total: monto,
      comision: 0,
      hostess_id: null,
      fecha_crea: now,
      created_by: usuarioId
    });
  } catch (error) {
    logger.warn('[operacion/cuentas] No se pudo crear cuenta prepago automatica:', {
      cliente_id: clienteId,
      err: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Auto-cierre de cuentas PREP-* cuando el saldo llega a 0 tras una devolución.
 * Mismo SQL que `ClientRepository.devolverSaldo`.
 */
export async function cerrarCuentasPrepagoSaldadas(
  clienteId: string,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    `UPDATE cuentas SET estado = 0, fecha_mod = ? WHERE cliente_id = ? AND codigo LIKE 'PREP-%' AND estado = 1`,
    [getNowInBusinessTimezone(), clienteId]
  );
}

/**
 * Temporizador de una cuenta: lectura, cierre de sesión de habitación y
 * solicitud de anuluación. Mismo SQL que `CuentaQueries.stopTimer` y
 * `requestAnulacion`, con `ContextoOperacion` en vez de transacción heredada.
 */

export interface CuentaTemporizador {
  id_cuenta: string;
  estado: number;
  tiempo_actual: number | null;
  tiempo_inicio_actual: string | null;
  total: number;
  habitacion_id: string | null;
  habitaciones_historial: unknown;
  fecha_crea: string;
  habitacion_numero?: string | null;
}

export async function leerCuentaParaTemporizador(
  cuentaId: string,
  contexto: ContextoOperacion
): Promise<CuentaTemporizador | null> {
  const rows = await resolverTransaccion(contexto)<CuentaTemporizador[]>(
    `SELECT c.id_cuenta, c.estado, c.tiempo_actual, c.tiempo_inicio_actual, c.total, c.habitacion_id,
            c.habitaciones_historial, c.fecha_crea, h.nombre as habitacion_numero
       FROM cuentas c
       LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
      WHERE c.id_cuenta = ?`,
    [cuentaId]
  );
  return rows[0] ?? null;
}

export async function finalizarSesionHabitacion(
  cuentaId: string,
  nowStr: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  const rows = await trx<(CuentaTemporizador & { habitacion_numero: string | null })[]>(
    `SELECT c.*, h.nombre as habitacion_numero
       FROM cuentas c
       LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
      WHERE c.id_cuenta = ?`,
    [cuentaId]
  );
  if (!rows.length) return;
  const row = rows[0];
  const timing = getRemainingMinutes(row as never, parseBusinessDate(nowStr));
  let history = parseRoomHistory(row.habitaciones_historial);
  history = ensureOpenHistorySegment(
    history,
    row as never,
    row.habitacion_numero || 'Sin habitacion'
  );
  history = closeOpenHistorySegment(
    history,
    nowStr,
    timing.elapsedMinutes,
    !timing.isActive,
    timing.isActive ? 'manual' : 'expired'
  );
  await trx(
    'UPDATE cuentas SET tiempo_actual = 0, tiempo_inicio_actual = NULL, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
    [stringifyRoomHistory(history), nowStr, cuentaId]
  );
}

export async function detenerSinHabitacion(
  cuentaId: string,
  nowStr: string,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE cuentas SET tiempo_actual = 0, tiempo_inicio_actual = NULL, fecha_mod = ? WHERE id_cuenta = ?',
    [nowStr, cuentaId]
  );
}

export async function marcarEstadoCuenta(
  cuentaId: string,
  estado: number,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE cuentas SET estado = ?, fecha_mod = ? WHERE id_cuenta = ?',
    [estado, getNowInBusinessTimezone(), cuentaId]
  );
}

export async function actualizarTemporizadorCancelado(
  cuentaId: string,
  historialJson: string | null,
  nowStr: string,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE cuentas SET tiempo_actual = 0, tiempo_inicio_actual = NULL, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
    [historialJson, nowStr, cuentaId]
  );
}

export async function crearSolicitudAnulacionCuenta(
  cuentaId: string,
  monto: number,
  motivo: string,
  solicitadoPor: string,
  contexto: ContextoOperacion
): Promise<string> {
  const idAnul = generateUUID();
  await resolverTransaccion(contexto)(
    `INSERT INTO solicitudes_anulacion_cuentas (id, cuenta_id, monto, motivo, requested_by, estado, fecha_crea)
     VALUES (?, ?, ?, ?, ?, 'pendiente', ?)`,
    [idAnul, cuentaId, monto, motivo, solicitadoPor, getNowInBusinessTimezone()]
  );
  return idAnul;
}

/**
 * Edición de cuentas: lectura y escritura de `cuentas`, `detalle_cuentas` y
 * `cuentas_usuarios`. Mismo SQL que `CuentaQueries.updateCuenta`, con
 * `ContextoOperacion` en vez de transacción heredada.
 */

export async function leerTotalesCuenta(
  cuentaId: string,
  contexto: ContextoOperacion
): Promise<{ sub_total: number; total_comision: number }> {
  const rows = await resolverTransaccion(contexto)<{ sub_total: number; total_comision: number }[]>(
    'SELECT sub_total, total_comision FROM cuentas WHERE id_cuenta = ?',
    [cuentaId]
  );
  return {
    sub_total: Number(rows[0]?.sub_total || 0),
    total_comision: Number(rows[0]?.total_comision || 0)
  };
}

export async function acumularTotalesCuenta(
  cuentaId: string,
  nuevoSubTotal: number,
  nuevaComision: number,
  nowStr: string,
  contexto: ContextoOperacion
): Promise<void> {
  const actual = await leerTotalesCuenta(cuentaId, contexto);
  const finalSub = actual.sub_total + nuevoSubTotal;
  const finalComm = actual.total_comision + nuevaComision;
  await resolverTransaccion(contexto)(
    'UPDATE cuentas SET sub_total = ?, total_comision = ?, total = ?, fecha_mod = ? WHERE id_cuenta = ?',
    [finalSub, finalComm, finalSub, nowStr, cuentaId]
  );
}

export interface DetalleCuentaNuevo {
  producto_id: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
  hostesses?: (string | null)[];
  isChampagne?: boolean;
}

export async function agregarDetallesCuenta(
  cuentaId: string,
  detalles: DetalleCuentaNuevo[],
  usuarios: string[] | undefined,
  createdBy: string,
  nowStr: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  for (const d of detalles) {
    const hasAnfitrionas = (usuarios ?? []).length > 0;
    const selectedHostesses = d.hostesses?.length ? d.hostesses : [null];
    const isSpecial = d.isChampagne || d.precio >= 160000;
    const comision = hasAnfitrionas ? d.comision || 0 : 0;
    if (isSpecial) {
      const tComm = Math.round(comision);
      const base = Math.floor(tComm / selectedHostesses.length);
      const rem = tComm % selectedHostesses.length;
      for (let i = 0; i < selectedHostesses.length; i++) {
        await trx(
          'INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            generateUUID(),
            cuentaId,
            d.producto_id,
            d.precio,
            i === 0 ? d.cantidad : 0,
            i === 0 ? d.sub_total : 0,
            base + (i === 0 ? rem : 0),
            selectedHostesses[i],
            nowStr,
            createdBy
          ]
        );
      }
    } else {
      const baseQty = Math.floor(d.cantidad / selectedHostesses.length);
      let remQty = d.cantidad;
      for (let i = 0; i < selectedHostesses.length; i++) {
        const qty = i === selectedHostesses.length - 1 ? remQty : baseQty === 0 ? 1 : baseQty;
        remQty -= qty;
        if (qty > 0 || selectedHostesses.length === 1) {
          await trx(
            'INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              generateUUID(),
              cuentaId,
              d.producto_id,
              d.precio,
              qty,
              d.precio * qty,
              comision,
              selectedHostesses[i],
              nowStr,
              createdBy
            ]
          );
        }
      }
    }
  }
}

export async function reemplazarUsuariosCuenta(
  cuentaId: string,
  usuarioIds: string[],
  nowStr: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  await trx('DELETE FROM cuentas_usuarios WHERE cuenta_id = ?', [cuentaId]);
  for (const uId of usuarioIds) {
    await trx(
      'INSERT INTO cuentas_usuarios (id_cuenta_usuario, cuenta_id, usuario_id, fecha_crea) VALUES (?, ?, ?, ?)',
      [generateUUID(), cuentaId, uId, nowStr]
    );
  }
}

export interface CuentaParaTiempo {
  id_cuenta: string;
  codigo: string;
  cliente_id: string | null;
  habitacion_id: string | null;
  tiempo: number;
  tiempo_actual: number | null;
  tiempo_inicio_actual: string | null;
  fecha_crea: string;
  habitaciones_historial: unknown;
}

export async function leerCuentaParaTiempo(
  cuentaId: string,
  contexto: ContextoOperacion
): Promise<CuentaParaTiempo | null> {
  const rows = await resolverTransaccion(contexto)<CuentaParaTiempo[]>(
    'SELECT * FROM cuentas WHERE id_cuenta = ?',
    [cuentaId]
  );
  return rows[0] ?? null;
}

export async function actualizarTiempoCuenta(
  cuentaId: string,
  campos: {
    tiempo: number;
    tiempo_actual: number;
    tiempo_inicio_actual: string;
    habitaciones_historial: string | null;
    fecha_mod: string;
  },
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE cuentas SET tiempo = ?, tiempo_actual = ?, tiempo_inicio_actual = ?, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
    [
      campos.tiempo,
      campos.tiempo_actual,
      campos.tiempo_inicio_actual,
      campos.habitaciones_historial,
      campos.fecha_mod,
      cuentaId
    ]
  );
}

export async function actualizarHabitacionCuenta(
  cuentaId: string,
  campos: {
    habitacion_id: string;
    tiempo: number;
    tiempo_actual: number;
    tiempo_inicio_actual: string;
    habitaciones_historial: string | null;
    fecha_mod: string;
  },
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE cuentas SET habitacion_id = ?, tiempo = ?, tiempo_actual = ?, tiempo_inicio_actual = ?, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
    [
      campos.habitacion_id,
      campos.tiempo,
      campos.tiempo_actual,
      campos.tiempo_inicio_actual,
      campos.habitaciones_historial,
      campos.fecha_mod,
      cuentaId
    ]
  );
}

export interface HabitacionParaCuenta {
  nombre: string;
  precio: number;
  tiempo: number | null;
  comision_anfitriona: number;
}

export async function leerHabitacionParaCuenta(
  habitacionId: string,
  contexto: ContextoOperacion
): Promise<HabitacionParaCuenta | null> {
  const rows = await resolverTransaccion(contexto)<HabitacionParaCuenta[]>(
    'SELECT nombre, precio, tiempo as tiempo, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
    [habitacionId]
  );
  return rows[0] ?? null;
}

export async function leerNombreHabitacion(
  habitacionId: string,
  contexto: ContextoOperacion
): Promise<string | null> {
  const rows = await resolverTransaccion(contexto)<{ nombre: string }[]>(
    'SELECT nombre FROM habitaciones WHERE id_habitacion = ?',
    [habitacionId]
  );
  return rows[0]?.nombre ?? null;
}

export async function leerNombreClienteCuenta(
  cuentaId: string,
  contexto: ContextoOperacion
): Promise<string | null> {
  const rows = await resolverTransaccion(contexto)<{ nombre: string | null }[]>(
    'SELECT cl.nombre FROM cuentas c LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id WHERE c.id_cuenta = ?',
    [cuentaId]
  );
  return rows[0]?.nombre ?? null;
}

/**
 * Cierre de una cuenta temporizada. La escribe el propio módulo en la misma
 * unidad donde se libera la habitación.
 */
export async function finalizarCuentaTemporizada(
  cuentaId: string,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)('UPDATE cuentas SET estado = 0 WHERE id_cuenta = ?', [
    cuentaId
  ]);
}

export interface CuentaParaCambio {
  codigo: string;
  cliente_id: string | null;
  habitacion_id: string | null;
  tiempo: number;
  tiempo_actual: number | null;
  tiempo_inicio_actual: string | null;
  fecha_crea: string;
  habitaciones_historial: unknown;
}

export async function leerCuentaParaCambio(
  cuentaId: string,
  contexto: ContextoOperacion
): Promise<CuentaParaCambio | null> {
  const rows = await resolverTransaccion(contexto)<CuentaParaCambio[]>(
    'SELECT codigo, cliente_id, habitacion_id, tiempo, tiempo_actual, tiempo_inicio_actual, fecha_crea, habitaciones_historial FROM cuentas WHERE id_cuenta = ?',
    [cuentaId]
  );
  return rows[0] ?? null;
}

/**
 * Alta de cuentas. Mismo SQL que `CuentaQueries.create`, con
 * `ContextoOperacion` en vez de transacción heredada.
 */

export interface DatosAltaCuenta {
  codigo: string;
  cliente_id?: string | null;
  total_comision: number;
  habitacion_id?: string | null;
  habitacion_nombre?: string;
  sub_total: number;
  total: number;
  propina?: number;
  tiempo?: number;
  created_by: string;
  fecha_crea: string;
}

export async function insertarCuentaBase(
  id: string,
  data: DatosAltaCuenta,
  contexto: ContextoOperacion
): Promise<void> {
  await BaseRepository.insert(resolverTransaccion(contexto), 'cuentas', {
    id_cuenta: id,
    codigo: data.codigo,
    cliente_id: data.cliente_id || null,
    total_comision: data.total_comision,
    habitacion_id: data.habitacion_id || null,
    sub_total: data.sub_total,
    total: data.total,
    propina: data.propina || 0,
    fecha_crea: data.fecha_crea,
    estado: 1,
    tiempo: data.tiempo || 0,
    tiempo_actual: data.tiempo || 0,
    tiempo_inicio_actual: data.habitacion_id && (data.tiempo ?? 0) > 0 ? data.fecha_crea : null,
    habitaciones_historial:
      data.habitacion_id && (data.tiempo ?? 0) > 0
        ? JSON.stringify([
            {
              roomId: String(data.habitacion_id),
              roomName: data.habitacion_nombre || 'Sin habitacion',
              startedAt: data.fecha_crea,
              endedAt: null,
              assignedMinutes: Number(data.tiempo || 0),
              consumedMinutes: 0
            }
          ])
        : null,
    created_by: data.created_by
  });
}

export async function reescribirHistorialAlta(
  cuentaId: string,
  habitacionId: string,
  roomName: string,
  tiempo: number,
  nowStr: string,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE cuentas SET habitaciones_historial = ? WHERE id_cuenta = ?',
    [
      JSON.stringify([
        {
          roomId: String(habitacionId),
          roomName: roomName || habitacionId,
          startedAt: nowStr,
          endedAt: null,
          assignedMinutes: Number(tiempo || 0),
          consumedMinutes: 0
        }
      ]),
      cuentaId
    ]
  );
}

export async function leerNombreCliente(
  clienteId: string | null,
  contexto: ContextoOperacion
): Promise<string | null> {
  if (!clienteId) return null;
  const rows = await resolverTransaccion(contexto)<{ nombre: string | null }[]>(
    'SELECT nombre FROM clientes WHERE id_cliente = ?',
    [clienteId]
  );
  return rows[0]?.nombre ?? null;
}
