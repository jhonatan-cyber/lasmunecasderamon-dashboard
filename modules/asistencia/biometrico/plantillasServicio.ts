import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { eliminarPlantillasUsuario } from './unenrollmentRepositorio';

export function eliminarPlantillasLocales(usuarioId: string, contexto: ContextoOperacion) {
  return eliminarPlantillasUsuario(usuarioId, contexto);
}
