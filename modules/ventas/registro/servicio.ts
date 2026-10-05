import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { RegistroVenta } from './repositorio';

export function registrarCabeceraVenta(
  contexto: ContextoOperacion,
  datos: Record<string, unknown>
) {
  const columnas = [
    'id_venta',
    'codigo',
    'cliente_id',
    'pedido_id',
    'habitacion_id',
    'metodo_pago',
    'propina',
    'sub_total',
    'total',
    'total_comision',
    'tiempo',
    'caja_id',
    'created_by',
    'estado',
    'fecha_crea',
    'pagos_mixtos'
  ];
  const cabecera = Object.fromEntries(columnas.map(columna => [columna, datos[columna]]));
  return RegistroVenta.rawInsert(contexto, cabecera);
}

export function registrarDetallesVenta(
  contexto: ContextoOperacion,
  detalles: Array<Record<string, unknown>>
) {
  return RegistroVenta.batchInsertDetails(contexto, detalles);
}

export function asignarAnfitrionasVenta(
  contexto: ContextoOperacion,
  ventaId: string,
  usuarioIds: string[],
  fecha: string
) {
  return RegistroVenta.batchInsertUserRelations(contexto, ventaId, usuarioIds, fecha);
}
