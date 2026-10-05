import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import * as repositorio from './repositorio';
export function finalizarVentasTemporizadas(
  ...args: Parameters<typeof repositorio.finalizarVentasTemporizadas>
) {
  return repositorio.finalizarVentasTemporizadas(...args);
}

/** Termina la venta en la unidad que también libera habitación y disponibilidad. */
export async function finalizarVentaTemporizada(
  ventaId: string,
  contexto: ContextoOperacion,
  fecha?: string
) {
  await repositorio.finalizarVentaTemporizada(ventaId, contexto, fecha);
}

export function pausarVentasEnConflicto(
  ...args: Parameters<typeof repositorio.pausarVentasEnConflicto>
) {
  return repositorio.pausarVentasEnConflicto(...args);
}

export function obtenerUltimaVentaPausada(
  ...args: Parameters<typeof repositorio.obtenerUltimaVentaPausada>
) {
  return repositorio.obtenerUltimaVentaPausada(...args);
}

export function reanudarVentaPausada(...args: Parameters<typeof repositorio.reanudarVentaPausada>) {
  return repositorio.reanudarVentaPausada(...args);
}

export function marcarAvisoVenta(...args: Parameters<typeof repositorio.marcarAvisoVenta>) {
  return repositorio.marcarAvisoVenta(...args);
}
