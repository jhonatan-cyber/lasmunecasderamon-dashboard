import * as repositorio from './logsRepositorio';
export function addServicioLog(...args: Parameters<typeof repositorio.addServicioLog>) {
  return repositorio.addServicioLog(...args);
}
