import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import * as repositorio from './liquidacionRepositorio';

export function liquidarAsistencias(usuarioId: string, fecha: string, contexto: ContextoOperacion) {
  return repositorio.liquidarAsistencias(usuarioId, fecha, contexto);
}
