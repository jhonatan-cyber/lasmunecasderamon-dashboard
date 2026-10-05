import { query, generateUUID } from '@/lib/database/db';
import { BaseRepository } from '@/lib/database/base-repository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
export async function guardarPlantilla(
  usuarioId: string,
  dispositivoId: string,
  tipo: 'huella' | 'cara',
  datos: string,
  opciones: {
    sincronizada?: boolean;
    contexto?: import('@/lib/transaccion/contrato').ContextoOperacion;
  } = {}
): Promise<void> {
  const queryFn = opciones.contexto ? resolverTransaccion(opciones.contexto) : query;
  const sincronizada = opciones.sincronizada ?? true;
  const existente = await queryFn<{ id: string; datos: string }[]>(
    `SELECT id, datos FROM biometric_plantillas
      WHERE usuario_id = ? AND dispositivo_id = ? AND tipo = ?`,
    [usuarioId, dispositivoId, tipo]
  );

  const ahora = getNowInBusinessTimezone();
  const marcaSync = sincronizada ? ahora : null;
  if (existente.length > 0 && existente[0].datos === datos) {
    await queryFn(
      `UPDATE biometric_plantillas
          SET fecha_sincronizacion = ?, sincronizada = ?
        WHERE id = ?`,
      [marcaSync, sincronizada ? 1 : 0, existente[0].id]
    );
    return;
  }

  if (existente.length > 0) {
    await queryFn(
      'UPDATE biometric_plantillas SET datos = ?, fecha_captura = ?, sincronizada = ?, fecha_sincronizacion = ?, vector = NULL, vector_actualizado_en = NULL WHERE id = ?',
      [datos, ahora, sincronizada ? 1 : 0, marcaSync, existente[0].id]
    );
  } else {
    await BaseRepository.insert(queryFn, 'biometric_plantillas', {
      id: generateUUID(),
      usuario_id: usuarioId,
      dispositivo_id: dispositivoId,
      tipo,
      datos,
      sincronizada: sincronizada ? 1 : 0,
      fecha_sincronizacion: marcaSync
    });
  }
}
