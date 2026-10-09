import * as infraestructura from './infraestructura';

export const HORAS_ENVASE_SIN_CONFIRMAR = infraestructura.HORAS_ENVASE_SIN_CONFIRMAR;
export function listarDevoluciones(...args: Parameters<typeof infraestructura.listarDevoluciones>) {
  return infraestructura.listarDevoluciones(...args);
}
export function obtenerResumenEnvases(
  ...args: Parameters<typeof infraestructura.obtenerResumenEnvases>
) {
  return infraestructura.obtenerResumenEnvases(...args);
}
export function verificarEnvase(...args: Parameters<typeof infraestructura.verificarEnvase>) {
  return infraestructura.verificarEnvase(...args);
}
export function verificarEnvases(...args: Parameters<typeof infraestructura.verificarEnvases>) {
  return infraestructura.verificarEnvases(...args);
}
export function confirmarRecepcionEnvase(
  ...args: Parameters<typeof infraestructura.confirmarRecepcionEnvase>
) {
  return infraestructura.confirmarRecepcionEnvase(...args);
}
export type { ResumenEnvases } from './infraestructura';
