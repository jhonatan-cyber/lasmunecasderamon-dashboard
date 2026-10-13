import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { BusinessError } from '@/lib/errors/errors';
import { generateUUID } from '@/lib/database/db';

export async function bloquearServicioActivo(id: string, contexto: ContextoOperacion) {
  const rows = await resolverTransaccion(contexto)<
    {
      estado: number;
      habitacion_id: string;
      cliente_id: string | null;
      es_temporal: number;
      servicio_original_id: string | null;
    }[]
  >(
    'SELECT estado, habitacion_id, cliente_id, es_temporal, servicio_original_id FROM servicios WHERE id_servicio = ? FOR UPDATE',
    [id]
  );
  if (!rows[0] || ![2, 3].includes(Number(rows[0].estado)))
    throw new BusinessError('El servicio ya no está activo', 'SERVICE_NOT_ACTIVE');
  return rows[0];
}

export async function guardarAsignaciones(
  id: string,
  ids: string[],
  fecha: string,
  contexto: ContextoOperacion
) {
  const trx = resolverTransaccion(contexto);
  const anteriores = await trx<{ usuario_id: string }[]>(
    'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ? AND liberado_en IS NULL',
    [id]
  );
  const prev = anteriores.map(row => row.usuario_id);
  const retiradas = prev.filter(uid => !ids.includes(uid));
  const nuevas = ids.filter(uid => !prev.includes(uid));
  if (retiradas.length)
    await trx(
      `UPDATE detalle_servicios SET liberado_en = ? WHERE servicio_id = ? AND liberado_en IS NULL AND usuario_id IN (${retiradas.map(() => '?').join(',')})`,
      [fecha, id, ...retiradas]
    );
  for (const uid of nuevas)
    await trx(
      'INSERT INTO detalle_servicios (id_detalle_servicio, servicio_id, usuario_id, comision, fecha_crea) VALUES (?, ?, ?, 0, ?)',
      [generateUUID(), id, uid, fecha]
    );
  return { retiradas, nuevas };
}
