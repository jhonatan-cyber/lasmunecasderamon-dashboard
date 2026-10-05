import * as infraestructura from './infraestructura';

export function generarUnidades(...args: Parameters<typeof infraestructura.generarUnidades>) {
  return infraestructura.generarUnidades(...args);
}
export function registrarUnidades(...args: Parameters<typeof infraestructura.registrarUnidades>) {
  return infraestructura.registrarUnidades(...args);
}
export function sincronizarStockTotal(
  ...args: Parameters<typeof infraestructura.sincronizarStockTotal>
) {
  return infraestructura.sincronizarStockTotal(...args);
}
export function cambiarEstadoUnidades(
  ...args: Parameters<typeof infraestructura.cambiarEstadoUnidades>
) {
  return infraestructura.cambiarEstadoUnidades(...args);
}
export function listarUnidades(...args: Parameters<typeof infraestructura.listarUnidades>) {
  return infraestructura.listarUnidades(...args);
}
export function marcarUnidadesImpresas(
  ...args: Parameters<typeof infraestructura.marcarUnidadesImpresas>
) {
  return infraestructura.marcarUnidadesImpresas(...args);
}
