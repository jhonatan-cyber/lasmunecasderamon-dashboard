import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';

export async function eliminarPlantillasUsuario(usuarioId: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)('DELETE FROM biometric_plantillas WHERE usuario_id = ?', [
    usuarioId
  ]);
}
