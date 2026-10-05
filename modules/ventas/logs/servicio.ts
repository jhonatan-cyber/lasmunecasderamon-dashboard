import * as repositorio from './repositorio';
export function addVentaLog(...args: Parameters<typeof repositorio.addVentaLog>) {
  return repositorio.addVentaLog(...args);
}
