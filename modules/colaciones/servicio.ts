import * as repositorio from './repositorio';

export function listarColaciones(...args: Parameters<typeof repositorio.listarColaciones>) {
  return repositorio.listarColaciones(...args);
}

export function registrarColacion(...args: Parameters<typeof repositorio.registrarColacion>) {
  return repositorio.registrarColacion(...args);
}
