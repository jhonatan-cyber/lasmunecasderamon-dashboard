import type { ContextoOperacion } from '@/lib/transaction/contract';
import { eliminarPlantillasUsuario } from './unenrollmentRepositorio';

export function eliminarPlantillasLocales(usuarioId: string, contexto: ContextoOperacion) {
  return eliminarPlantillasUsuario(usuarioId, contexto);
}
