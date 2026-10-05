import { generateUUID, type TransactionQuery } from '@/lib/database/db';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { BaseRepository } from '@/lib/database/base-repository';
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
