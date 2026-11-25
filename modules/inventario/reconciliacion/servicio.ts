import { ValidationError } from '@/lib/errors/errors';
import type { ReclasificarStockPendienteInput } from './repositorio';
import { ejecutarReclasificacionStockPendiente, listarFilasStockConciliacion } from './repositorio';
import { agruparStockConciliacion } from './modelo';

export { agruparStockConciliacion } from './modelo';

export async function listarConciliacionStock() {
  return agruparStockConciliacion(await listarFilasStockConciliacion());
}

export async function reclasificarStockPendiente(
  input: ReclasificarStockPendienteInput
): Promise<number> {
  const codigos = input.codigosUnidades.map(codigo => codigo.trim());
  if (
    codigos.length === 0 ||
    codigos.length > 200 ||
    codigos.some(codigo => !codigo || codigo.length > 64) ||
    new Set(codigos).size !== codigos.length
  ) {
    throw new ValidationError('Escanea entre 1 y 200 códigos de unidad únicos');
  }

  return await ejecutarReclasificacionStockPendiente({ ...input, codigosUnidades: codigos });
}
