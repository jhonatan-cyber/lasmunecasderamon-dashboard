import type { ContextoOperacion } from '@/lib/transaction/contract';
import * as repositorio from './loginRepositorio';

export function registrarMarcaLogin(
  usuarioId: string,
  fecha: string,
  hora: string,
  contexto: ContextoOperacion
) {
  return repositorio.registrarMarcaLogin(usuarioId, fecha, hora, contexto);
}
