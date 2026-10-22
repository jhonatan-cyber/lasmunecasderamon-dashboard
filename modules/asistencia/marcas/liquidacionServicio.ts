import type { ContextoOperacion } from '@/lib/transaction/contract';
import * as repositorio from './liquidacionRepositorio';

export function liquidarAsistencias(usuarioId: string, fecha: string, contexto: ContextoOperacion) {
  return repositorio.liquidarAsistencias(usuarioId, fecha, contexto);
}
