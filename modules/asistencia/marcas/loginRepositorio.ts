import { generateUUID } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';

export async function registrarMarcaLogin(
  usuarioId: string,
  fecha: string,
  hora: string,
  contexto: ContextoOperacion
) {
  await resolverTransaccion(contexto)(
    'INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?, 1) ON CONFLICT (usuario_id, fecha) DO NOTHING',
    [generateUUID(), usuarioId, fecha, hora]
  );
}
