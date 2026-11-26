import * as repositorio from './repositorio';

export function listarEntradas(...args: Parameters<typeof repositorio.listarEntradas>) {
  return repositorio.listarEntradas(...args);
}

export function listarEntradasCajaAbierta() {
  return repositorio.listarEntradasCajaAbierta();
}

export function listarPendientes(...args: Parameters<typeof repositorio.listarPendientes>) {
  return repositorio.listarPendientes(...args);
}

export function registrarEntrada(...args: Parameters<typeof repositorio.registrarEntrada>) {
  return repositorio.registrarEntrada(...args);
}

export function obtenerBaucherEntrada(
  ...args: Parameters<typeof repositorio.obtenerBaucherEntrada>
) {
  return repositorio.obtenerBaucherEntrada(...args);
}

export function entregarEntrada(...args: Parameters<typeof repositorio.entregarEntrada>) {
  return repositorio.entregarEntrada(...args);
}

export function entregarGrupoEntradas(
  ...args: Parameters<typeof repositorio.entregarGrupoEntradas>
) {
  return repositorio.entregarGrupoEntradas(...args);
}

export function anularEntrada(...args: Parameters<typeof repositorio.anularEntrada>) {
  return repositorio.anularEntrada(...args);
}

export function postearPendientesDeCaja(
  ...args: Parameters<typeof repositorio.postearPendientesDeCaja>
) {
  return repositorio.postearPendientesDeCaja(...args);
}

export function existeSolicitudAnulacionEntrada(
  ...args: Parameters<typeof repositorio.existeSolicitudAnulacionEntrada>
) {
  return repositorio.existeSolicitudAnulacionEntrada(...args);
}

export function crearSolicitudAnulacionEntrada(
  ...args: Parameters<typeof repositorio.crearSolicitudAnulacionEntrada>
) {
  return repositorio.crearSolicitudAnulacionEntrada(...args);
}

export function obtenerSolicitudAnulacionEntradaPorToken(
  ...args: Parameters<typeof repositorio.obtenerSolicitudAnulacionEntradaPorToken>
) {
  return repositorio.obtenerSolicitudAnulacionEntradaPorToken(...args);
}

export function actualizarSolicitudAnulacionEntrada(
  ...args: Parameters<typeof repositorio.actualizarSolicitudAnulacionEntrada>
) {
  return repositorio.actualizarSolicitudAnulacionEntrada(...args);
}

export function leerSolicitudAnulacionEntrada(
  ...args: Parameters<typeof repositorio.leerSolicitudAnulacionEntrada>
) {
  return repositorio.leerSolicitudAnulacionEntrada(...args);
}

export function obtenerEntradaPendienteParaAnular(
  ...args: Parameters<typeof repositorio.obtenerEntradaPendienteParaAnular>
) {
  return repositorio.obtenerEntradaPendienteParaAnular(...args);
}

export function marcarEntradaComoAnulada(
  ...args: Parameters<typeof repositorio.marcarEntradaComoAnulada>
) {
  return repositorio.marcarEntradaComoAnulada(...args);
}
