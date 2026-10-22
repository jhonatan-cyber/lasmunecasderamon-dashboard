import type { ContextoOperacion } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';

export async function eliminarPlantillasUsuario(usuarioId: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)('DELETE FROM biometric_plantillas WHERE usuario_id = ?', [
    usuarioId
  ]);
}
