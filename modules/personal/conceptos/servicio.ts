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
  leerResumenPropinas as leerResumenPropinasRepo,
  leerPropinasDeUsuario as leerPropinasDeUsuarioRepo,
  leerDetallePropinas as leerDetallePropinasRepo,
  obtenerPropinaConParticipantes as obtenerPropinaConParticipantesRepo,
  resumirComisiones as resumirComisionesRepo,
  listarComisiones as listarComisionesRepo,
  crearComision as crearComisionRepo,
  detalleComisionesDeUsuario as detalleComisionesDeUsuarioRepo,
  actualizarComision as actualizarComisionRepo,
  anularComision as anularComisionRepo,
  insertarComisionConDetalle as insertarComisionConDetalleRepo,
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

export function leerResumenPropinas(isAdmin: boolean, userId: string, cajaActiva: boolean) {
  return leerResumenPropinasRepo(isAdmin, userId, cajaActiva);
}

export function leerPropinasDeUsuario(userId: string) {
  return leerPropinasDeUsuarioRepo(userId);
}

export function leerDetallePropinas(usuario_id: string, startDate?: string, endDate?: string) {
  return leerDetallePropinasRepo(usuario_id, startDate, endDate);
}

export function obtenerPropinaConParticipantes(id: string) {
  return obtenerPropinaConParticipantesRepo(id);
}

export function resumirComisiones() {
  return resumirComisionesRepo();
}

export function listarComisiones(params: {
  status?: string;
  employeeId?: string;
  search?: string;
}) {
  return listarComisionesRepo(params);
}

export function crearComision(data: Record<string, unknown>) {
  return crearComisionRepo(data);
}

export function detalleComisionesDeUsuario(usuarioId: string) {
  return detalleComisionesDeUsuarioRepo(usuarioId);
}

export function actualizarComision(id: string, data: Record<string, unknown>) {
  return actualizarComisionRepo(id, data);
}

export function anularComision(id: string) {
  return anularComisionRepo(id);
}

export function insertarComisionConDetalle(
  data: { venta_id: string; usuario_id: string; monto: number },
  contexto: ContextoOperacion
) {
  return insertarComisionConDetalleRepo(data, contexto);
}
