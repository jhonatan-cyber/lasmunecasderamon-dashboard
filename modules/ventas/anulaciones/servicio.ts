import * as repositorio from './repositorio';

export function obtenerVentaParaAnulacion(
  ...args: Parameters<typeof repositorio.obtenerVentaParaAnulacion>
) {
  return repositorio.obtenerVentaParaAnulacion(...args);
}

export function existeSolicitudAnulacion(
  ...args: Parameters<typeof repositorio.existeSolicitudAnulacion>
) {
  return repositorio.existeSolicitudAnulacion(...args);
}

export function listarSolicitudesPendientes(
  ...args: Parameters<typeof repositorio.listarSolicitudesPendientes>
) {
  return repositorio.listarSolicitudesPendientes(...args);
}

export function obtenerSolicitudPorToken(
  ...args: Parameters<typeof repositorio.obtenerSolicitudPorToken>
) {
  return repositorio.obtenerSolicitudPorToken(...args);
}

export function leerVentaParaAnular(...args: Parameters<typeof repositorio.leerVentaParaAnular>) {
  return repositorio.leerVentaParaAnular(...args);
}

export function estadoTrasSolicitud(...args: Parameters<typeof repositorio.estadoTrasSolicitud>) {
  return repositorio.estadoTrasSolicitud(...args);
}

export function marcarEstadoVenta(...args: Parameters<typeof repositorio.marcarEstadoVenta>) {
  return repositorio.marcarEstadoVenta(...args);
}

export function leerDetallesParaDevolucion(
  ...args: Parameters<typeof repositorio.leerDetallesParaDevolucion>
) {
  return repositorio.leerDetallesParaDevolucion(...args);
}

export function registrarDevolucionVenta(
  ...args: Parameters<typeof repositorio.registrarDevolucionVenta>
) {
  return repositorio.registrarDevolucionVenta(...args);
}

export function ajustarDetallesVenta(...args: Parameters<typeof repositorio.ajustarDetallesVenta>) {
  return repositorio.ajustarDetallesVenta(...args);
}

export function actualizarVentaParcial(
  ...args: Parameters<typeof repositorio.actualizarVentaParcial>
) {
  return repositorio.actualizarVentaParcial(...args);
}

export function crearSolicitudAnulacion(
  ...args: Parameters<typeof repositorio.crearSolicitudAnulacion>
) {
  return repositorio.crearSolicitudAnulacion(...args);
}

export function actualizarEstadoSolicitud(
  ...args: Parameters<typeof repositorio.actualizarEstadoSolicitud>
) {
  return repositorio.actualizarEstadoSolicitud(...args);
}

export function leerVentaDeSolicitud(...args: Parameters<typeof repositorio.leerVentaDeSolicitud>) {
  return repositorio.leerVentaDeSolicitud(...args);
}

export function leerMontoSolicitud(...args: Parameters<typeof repositorio.leerMontoSolicitud>) {
  return repositorio.leerMontoSolicitud(...args);
}

export function leerAnfitrionasVenta(...args: Parameters<typeof repositorio.leerAnfitrionasVenta>) {
  return repositorio.leerAnfitrionasVenta(...args);
}

export function eliminarVentaFisica(...args: Parameters<typeof repositorio.eliminarVentaFisica>) {
  return repositorio.eliminarVentaFisica(...args);
}
