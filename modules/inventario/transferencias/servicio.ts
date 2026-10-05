import * as infraestructura from './infraestructura';

export function listarTransferencias(
  ...args: Parameters<typeof infraestructura.listarTransferencias>
) {
  return infraestructura.listarTransferencias(...args);
}
export function traspasarAlBar(...args: Parameters<typeof infraestructura.traspasarAlBar>) {
  return infraestructura.traspasarAlBar(...args);
}
export function aceptarTransferencia(
  ...args: Parameters<typeof infraestructura.aceptarTransferencia>
) {
  return infraestructura.aceptarTransferencia(...args);
}
export function rechazarTransferencia(
  ...args: Parameters<typeof infraestructura.rechazarTransferencia>
) {
  return infraestructura.rechazarTransferencia(...args);
}
