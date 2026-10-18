import * as repositorio from './repositorio';

export function listarEntradas(...args: Parameters<typeof repositorio.listarEntradas>) {
  return repositorio.listarEntradas(...args);
}

export function registrarEntrada(...args: Parameters<typeof repositorio.registrarEntrada>) {
  return repositorio.registrarEntrada(...args);
}
