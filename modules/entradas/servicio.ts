import * as repositorio from './repositorio';

export function listarEntradas(...args: Parameters<typeof repositorio.listarEntradas>) {
  return repositorio.listarEntradas(...args);
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

export function anularEntrada(...args: Parameters<typeof repositorio.anularEntrada>) {
  return repositorio.anularEntrada(...args);
}

export function postearPendientesDeCaja(
  ...args: Parameters<typeof repositorio.postearPendientesDeCaja>
) {
  return repositorio.postearPendientesDeCaja(...args);
}
