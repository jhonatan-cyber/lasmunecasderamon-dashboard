import * as infraestructura from './infraestructura';

export function listarPresentaciones(
  ...args: Parameters<typeof infraestructura.listarPresentaciones>
) {
  return infraestructura.listarPresentaciones(...args);
}
export function listarPresentacionesPorProductos(
  ...args: Parameters<typeof infraestructura.listarPresentacionesPorProductos>
) {
  return infraestructura.listarPresentacionesPorProductos(...args);
}
export function crearPresentacion(...args: Parameters<typeof infraestructura.crearPresentacion>) {
  return infraestructura.crearPresentacion(...args);
}
export function actualizarPresentacion(
  ...args: Parameters<typeof infraestructura.actualizarPresentacion>
) {
  return infraestructura.actualizarPresentacion(...args);
}
export function actualizarFotoPresentacion(
  ...args: Parameters<typeof infraestructura.actualizarFotoPresentacion>
) {
  return infraestructura.actualizarFotoPresentacion(...args);
}
export function eliminarPresentacion(
  ...args: Parameters<typeof infraestructura.eliminarPresentacion>
) {
  return infraestructura.eliminarPresentacion(...args);
}
export function obtenerPresentacion(
  ...args: Parameters<typeof infraestructura.obtenerPresentacion>
) {
  return infraestructura.obtenerPresentacion(...args);
}
export function buscarPresentacionPorCodigo(
  ...args: Parameters<typeof infraestructura.buscarPresentacionPorCodigo>
) {
  return infraestructura.buscarPresentacionPorCodigo(...args);
}
