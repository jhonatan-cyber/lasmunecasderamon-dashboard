import type { z } from 'zod';
import type { ServiceCreateSchema } from '@/lib/business/schemas';
import { BusinessError } from '@/lib/errors/errors';
import {
  esHabitacionLibreIngreso,
  type HabitacionRegistro
} from '@/lib/business/registroOperacion';
import {
  calcularDeltasCaja,
  calcularDeltasPagoSimple,
  type MixedPayment
} from '@/lib/business/pagosMixtos';

type ServicioValidado = z.output<typeof ServiceCreateSchema>;

export function validarReferenciaAdicional(id: string | null | undefined): string {
  if (!id) throw new BusinessError('Selecciona el servicio original para crear el adicional');
  return id;
}

export function validarServicioOriginal(
  original: { es_temporal?: number; habitacion_id: string },
  habitacionId: string
): void {
  if (Number(original.es_temporal) === 1)
    throw new BusinessError('Crea el adicional desde el servicio principal');
  if (String(original.habitacion_id) !== String(habitacionId))
    throw new BusinessError('El servicio adicional debe usar la habitación del servicio original');
}

export function validarAdicionalDisponible(adicional: unknown): void {
  if (adicional)
    throw new BusinessError(
      'Este servicio ya tiene un adicional activo',
      'TEMPORARY_SERVICE_ACTIVE'
    );
}

export function validarCajaServicio(cajaId: string | null | undefined): void {
  if (!cajaId)
    throw new BusinessError('Abre una caja antes de registrar un servicio', 'CASH_REGISTER_CLOSED');
}

function validarProductoIncluido(
  requiereProducto: boolean,
  presentacionId: string | null | undefined
): void {
  if (requiereProducto && !presentacionId) {
    throw new BusinessError(
      'Selecciona el producto incluido en la habitación',
      'INCLUDED_PRODUCT_REQUIRED'
    );
  }
  if (!requiereProducto && presentacionId) {
    throw new BusinessError('Esta habitación o extensión no incluye un producto');
  }
}

export function calcularCondicionesServicio(
  v: ServicioValidado,
  habitacion: HabitacionRegistro | null
) {
  const numAnfitrionas = Math.max(1, v.usuarios.length);
  const precioServicioInput = Number(v.precio_servicio || 0);
  let esLibreIngreso = false;
  let comisionHabitacion = 0;
  if (habitacion) {
    comisionHabitacion = Number(habitacion.comision_anfitriona || 0);
    esLibreIngreso = esHabitacionLibreIngreso(habitacion);
  }

  const tieneComisionHabitacion = comisionHabitacion > 0 && !v.es_temporal;
  const requiereProducto = tieneComisionHabitacion && !v.es_temporal;
  validarProductoIncluido(requiereProducto, v.producto_incluido_presentacion_id);
  const comisionIndividualBase = tieneComisionHabitacion
    ? Math.floor(comisionHabitacion / numAnfitrionas)
    : v.es_temporal
      ? Math.floor(precioServicioInput / numAnfitrionas)
      : precioServicioInput;
  const comisionTotal = tieneComisionHabitacion
    ? comisionHabitacion
    : v.es_temporal
      ? precioServicioInput
      : precioServicioInput * numAnfitrionas;

  return {
    esLibreIngreso,
    requiereProducto,
    tieneComisionHabitacion,
    numAnfitrionas,
    comisionIndividualBase,
    comisionTotal
  };
}

export function calcularEstadoServicio(
  v: Pick<ServicioValidado, 'tiempo'>,
  esLibreIngreso: boolean
): 1 | 2 {
  return esLibreIngreso && (!v.tiempo || v.tiempo <= 0) ? 1 : 2;
}

/** IDs de comisión y detalles en el mismo orden que la operación original. */
export function prepararDetallesServicio(
  hostessIds: string[],
  servicioId: string,
  now: string,
  esTemporal: number | boolean,
  condiciones: ReturnType<typeof calcularCondicionesServicio>,
  generarId: () => string
) {
  const { comisionTotal, comisionIndividualBase, numAnfitrionas, tieneComisionHabitacion } =
    condiciones;
  const commissionId = generarId();
  const remainder = tieneComisionHabitacion || esTemporal ? comisionTotal % numAnfitrionas : 0;

  const detalleComisionRows: Array<{
    id_detalle_comision: string;
    comision_id: string;
    usuario_id: string;
    comision: number;
    estado: number;
    fecha_crea: string;
  }> = [];
  const detalleServicioRows: Array<{
    id_detalle_servicio: string;
    usuario_id: string;
    servicio_id: string;
    comision: number;
    fecha_crea: string;
  }> = [];

  for (const [index, uId] of hostessIds.entries()) {
    const comisionIndividual = comisionIndividualBase + (index === 0 ? remainder : 0);
    detalleComisionRows.push({
      id_detalle_comision: generarId(),
      comision_id: commissionId,
      usuario_id: uId,
      comision: comisionIndividual,
      estado: 1,
      fecha_crea: now
    });
    detalleServicioRows.push({
      id_detalle_servicio: generarId(),
      usuario_id: uId,
      servicio_id: servicioId,
      comision: comisionIndividual,
      fecha_crea: now
    });
  }

  const comisiones = [
    {
      id_comision: commissionId,
      servicio_id: servicioId,
      monto: comisionTotal,
      estado: 1,
      fecha_crea: now
    }
  ];
  return { comisiones, detalleComisionRows, detalleServicioRows };
}

export function obtenerClientesServicio(v: ServicioValidado): string[] {
  const clientes =
    v.clientes && v.clientes.length > 0 ? v.clientes : v.cliente_id ? [v.cliente_id] : [];
  return clientes.filter(Boolean);
}

export function calcularMovimientoCajaServicio(
  v: ServicioValidado,
  pagos: MixedPayment[],
  prepago: number,
  comision: number
) {
  const deltas =
    v.metodo_pago === 'mixto'
      ? calcularDeltasCaja(pagos)
      : calcularDeltasPagoSimple(v.metodo_pago, Number(v.total) - prepago);
  return {
    servicio: Number(v.total) - Number(v.iva || 0),
    ...deltas,
    prepago,
    iva: v.iva,
    comision
  };
}
