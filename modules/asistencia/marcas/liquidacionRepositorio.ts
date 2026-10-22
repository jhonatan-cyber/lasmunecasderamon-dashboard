import type { ContextoOperacion } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';

export async function liquidarAsistencias(
  usuarioId: string,
  fecha: string,
  contexto: ContextoOperacion
) {
  await resolverTransaccion(contexto)(
    'UPDATE asistencias SET estado = 0, fecha_pago = ? WHERE usuario_id = ? AND estado = 1',
    [fecha, usuarioId]
  );
}
