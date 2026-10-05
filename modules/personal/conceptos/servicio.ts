import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { EntradaPropinaVenta, ComisionVenta, DetalleComisionVenta } from '../contracts';
import {
  insertarComisiones,
  insertarPropina,
  insertarComisionesServicio,
  anularComisionesVenta,
  anularPropinasVenta,
  anularComisionesServicio,
  leerComisionTotalServicio,
  leerComisionesVenta,
  ajustarComisionesVenta,
  leerPropinasVenta,
  ajustarPropinasVenta,
  type ComisionServicio
} from './repositorio';
export function registrarComisionesVenta(
  cabeceras: ComisionVenta[],
  detalles: DetalleComisionVenta[],
  contexto: ContextoOperacion
) {
  return insertarComisiones(contexto, cabeceras, detalles);
}
export function registrarPropinaVenta(entrada: EntradaPropinaVenta, contexto: ContextoOperacion) {
  return insertarPropina(entrada, contexto);
}
export function registrarComisionesServicio(
  cabeceras: ComisionServicio[],
  detalles: DetalleComisionVenta[],
  contexto: ContextoOperacion
) {
  return insertarComisionesServicio(contexto, cabeceras, detalles);
}
export function revertirComisionesPorAnulacion(ventaId: string, contexto: ContextoOperacion) {
  return anularComisionesVenta(ventaId, contexto);
}
export function revertirPropinasPorAnulacion(ventaId: string, contexto: ContextoOperacion) {
  return anularPropinasVenta(ventaId, contexto);
}
export function revertirComisionesServicioPorAnulacion(
  servicioId: string,
  contexto: ContextoOperacion
) {
  return anularComisionesServicio(servicioId, contexto);
}
export function leerComisionTotalServicioPorAnulacion(
  servicioId: string,
  contexto: ContextoOperacion
) {
  return leerComisionTotalServicio(servicioId, contexto);
}
export function leerComisionesPorAnulacion(ventaId: string, contexto: ContextoOperacion) {
  return leerComisionesVenta(ventaId, contexto);
}
export function ajustarComisionesPorAnulacion(
  filas: { id_comision: string; id_detalle_comision: string; monto: number }[],
  contexto: ContextoOperacion
) {
  return ajustarComisionesVenta(filas, contexto);
}
export function leerPropinasPorAnulacion(ventaId: string, contexto: ContextoOperacion) {
  return leerPropinasVenta(ventaId, contexto);
}
export function ajustarPropinasPorAnulacion(
  detalles: { id_detalle_propina: string; propina_id: string; monto: number }[],
  cabeceras: { id_propina: string; propina: number }[],
  contexto: ContextoOperacion
) {
  return ajustarPropinasVenta(detalles, cabeceras, contexto);
}
