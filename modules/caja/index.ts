import 'server-only';

/**
 * API pública del módulo Caja — servidor.
 *
 * Único punto de entrada para rutas HTTP y otros módulos (§5). Los repositorios son
 * privados: la puerta `modulo-solo-api-publica` de
 * `scripts/arquitectura/limites.mjs` falla ante cualquier import que apunte al
 * interior por otra vía. Los tipos que consumen los clientes viven en `./contracts`.
 *
 * Caja nace a medias en el corte 12: ya es dueña de las solicitudes de cierre, pero
 * el resto de su superficie (apertura, retiros, saldos y prepago) sigue en
 * `lib/repositories/CashRegisterRepository`. Esa mudanza es la parte grande de la
 * fase 5 y queda anotada en `docs/MODULOS_Y_DATOS.md`.
 */
export { listarSolicitudesCierrePendientes } from './cierres/servicio';

export {
  obtenerCajaActiva,
  registrarMovimientoCobro,
  ajustarIvaCaja,
  leerFondoCaja
} from './movimientos/servicio';

export { CashRegisterService } from './turnos/servicio';
export async function generarPdfCierreCaja(data: Record<string, unknown>): Promise<Buffer> {
  // jsPDF is only needed by PDF routes; load it on demand so importing the Caja
  // module does not pull browser-only globals into unrelated Node test/runtime paths.
  const { generarPdfCierreCaja: generar } = await import('./turnos/cierrePdf');
  return generar(data);
}

export { WithdrawalService } from './retiros/servicio';
