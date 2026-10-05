import { generateUUID } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';

export async function registrarMarcaLogin(
  usuarioId: string,
  fecha: string,
  hora: string,
  contexto: ContextoOperacion
) {
  await resolverTransaccion(contexto)(
    'INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?, 1)',
    [generateUUID(), usuarioId, fecha, hora]
  );
}
