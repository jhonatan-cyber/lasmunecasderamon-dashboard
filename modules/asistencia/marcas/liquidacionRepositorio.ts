import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';

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
