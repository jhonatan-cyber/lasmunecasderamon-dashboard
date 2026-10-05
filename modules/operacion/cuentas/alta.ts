/**
 * Alta de cuentas — caso de uso del módulo Operación.
 *
 * Mismo comportamiento que `CuentaQueries.create`, en una sola unidad con
 * `ContextoOperacion`: cabecera, detalles, usuarios y ocupación de
 * habitación, con los avisos después del commit.
 */
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
import { generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import {
  insertarCuentaBase,
  agregarDetallesCuenta,
  reemplazarUsuariosCuenta,
  reescribirHistorialAlta,
  leerHabitacionParaCuenta,
  leerNombreCliente,
  type DatosAltaCuenta,
  type DetalleCuentaNuevo
} from './repositorio';
import { ocuparHabitacionSiCorresponde } from '../facturacion/servicio';

type Tarea = () => void | Promise<void>;

export interface EntradaAltaCuenta extends Omit<DatosAltaCuenta, 'created_by' | 'fecha_crea'> {
  detalles: DetalleCuentaNuevo[];
  usuarios?: string[];
}

export async function crearCuentaEnUnidad(
  body: EntradaAltaCuenta,
  createdBy: string,
  contexto: ContextoOperacion,
  aplazar: (tarea: Tarea) => void
): Promise<string> {
  const id = generateUUID();
  const now = getNowInBusinessTimezone();

  await insertarCuentaBase(id, { ...body, created_by: createdBy, fecha_crea: now }, contexto);
  await agregarDetallesCuenta(id, body.detalles, body.usuarios, createdBy, now, contexto);

  if ((body.usuarios ?? []).length) {
    await reemplazarUsuariosCuenta(id, body.usuarios ?? [], now, contexto);
  }

  if (body.habitacion_id && (body.tiempo ?? 0) > 0) {
    const habitacion = await leerHabitacionParaCuenta(body.habitacion_id, contexto);
    await ocuparHabitacionSiCorresponde(
      body.habitacion_id,
      Number(habitacion?.precio || 0) > 0 ||
        Number(habitacion?.tiempo || 0) > 0 ||
        Number(habitacion?.comision_anfitriona || 0) > 0,
      contexto
    );
    await reescribirHistorialAlta(
      id,
      body.habitacion_id,
      habitacion?.nombre || body.habitacion_id,
      body.tiempo ?? 0,
      now,
      contexto
    );
    const clienteNombre = (await leerNombreCliente(body.cliente_id || null, contexto)) || 'Cliente';
    aplazar(() => {
      sendNotificationToAll('timer_started', {
        servicioId: id,
        roomId: body.habitacion_id,
        roomName: habitacion?.nombre || body.habitacion_id,
        duration: body.tiempo ?? 0,
        startTime: now,
        codigo: body.codigo,
        clienteNombre,
        tipoTransaccion: 'cuenta',
        status: 1
      });
    });
    aplazar(() => {
      sendNotificationToAll('timers_updated', { timestamp: now });
    });
  }

  return id;
}

export async function crearCuenta(body: EntradaAltaCuenta, createdBy: string): Promise<string> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  const id = await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => crearCuentaEnUnidad(body, createdBy, contexto, aplazar))
  );
  await ejecutarEfectosConfirmados(tareas);
  return id;
}
