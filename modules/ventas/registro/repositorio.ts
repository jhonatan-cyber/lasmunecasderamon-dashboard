import { generateUUID, type TransactionQuery } from '@/lib/database/db';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
export class RegistroVenta {
  static async rawInsert(contexto: ContextoOperacion, data: Record<string, unknown>) {
    return BaseRepository.insert(resolverTransaccion(contexto), 'ventas', data);
  }
  static async batchInsertDetails(
    contexto: ContextoOperacion,
    rows: Array<Record<string, unknown>>
  ): Promise<void> {
    const trx = resolverTransaccion(contexto);
    const columns = [
      'id_detalle_venta',
      'venta_id',
      'producto_id',
      'presentacion_id',
      'tipo_venta',
      'shot_anfitriona',
      'precio',
      'comision',
      'cantidad',
      'sub_total',
      'hostess_id',
      'fecha_crea'
    ];
    const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = rows.flatMap(row => columns.map(col => row[col]));

    await trx(`INSERT INTO detalle_ventas (${columns.join(', ')}) VALUES ${placeholders}`, values);
  }

  static async batchInsertUserRelations(
    contexto: ContextoOperacion,
    ventaId: string,
    usuarioIds: string[],
    now: string
  ): Promise<void> {
    if (usuarioIds.length === 0) return;

    const trx = resolverTransaccion(contexto);
    const columns = ['id_usuario_venta', 'venta_id', 'usuario_id', 'fecha_crea'];
    const rows = usuarioIds.map(usuarioId => [generateUUID(), ventaId, usuarioId, now]);
    const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = rows.flat();

    await trx(`INSERT INTO ventas_usuarios (${columns.join(', ')}) VALUES ${placeholders}`, values);
  }
}

export async function consultarHabitacion(habitacionId: string, contexto: ContextoOperacion) {
  const trx = resolverTransaccion(contexto);
  return await trx<any[]>(
    'SELECT precio, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
    [habitacionId]
  );
}

export async function consultarAnfitrionas(
  allRequestedHostessIds: string[],
  contexto: ContextoOperacion
) {
  const trx = resolverTransaccion(contexto);
  return await trx<any[]>(
    `SELECT DISTINCT u.id_usuario
           FROM usuarios u
           INNER JOIN roles r ON r.id_rol = u.rol_id
           INNER JOIN logins l ON l.usuario_id = u.id_usuario
           WHERE u.id_usuario IN (${allRequestedHostessIds.map(() => '?').join(', ')})
             AND u.estado = 1
             AND l.estado = 1
             AND l.en_local = 1
             AND LOWER(r.nombre) = 'anfitriona'`,
    allRequestedHostessIds
  );
}

// Auditoría conserva su infraestructura compartida hasta la fase 6.
import { AuditRepository, type AuditLog } from '@/lib/repositories/AuditRepository';
export function registrarAuditoriaVenta(datos: AuditLog, contexto: ContextoOperacion) {
  return AuditRepository.log(datos, resolverTransaccion(contexto));
}
