import { query, generateUUID } from '@/lib/db';
import { getActiveCaja, getCajaStats, closeNonAdminSessions } from '@/lib/procedures';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export class CashRegisterRepository {
  static async summary() {
    const cajaRow = await getActiveCaja();
    if (!cajaRow) return { balance_total: 0, cajas_abiertas: 0 };

    const { ventas, servicios } = await getCajaStats(cajaRow.fecha_apertura);
    const montoApertura = Number(cajaRow.monto_apertura || 0);
    const balanceTotal = Number(cajaRow.efectivo || 0) + Number(cajaRow.tarjeta || 0) + 
                       Number(cajaRow.transferencia || 0) + montoApertura - Number(cajaRow.devolucion || 0);

    return {
      ...cajaRow,
      monto_apertura: montoApertura,
      balance_total: balanceTotal,
      cantidad_ventas: ventas.cantidad,
      promedio_venta: ventas.promedio,
      cantidad_servicios: servicios.cantidad,
      promedio_servicio: servicios.promedio
    };
  }

  static async getAll() {
    return await query(`
      SELECT c.*, CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      WHERE c.estado IN (0, 1) ORDER BY c.fecha_apertura DESC
    `);
  }

  static async getById(id: string) {
    const res = await query<any[]>(`
      SELECT c.*, CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      WHERE c.id_caja = ?
    `, [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async open(usuario_id: string, monto_apertura: number) {
    const open = await query<any[]>('SELECT id_caja FROM cajas WHERE usuario_id_apertura = ? AND estado = 1', [usuario_id]);
    if (open.length > 0) throw new Error('Usuario ya tiene una caja abierta');

    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await query(`INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, estado) VALUES (?, ?, ?, ?, 1)`, [id, now, usuario_id, monto_apertura]);
    return id;
  }

  static async update(id: string, data: any) {
    const keys = Object.keys(data);
    const set = keys.map(k => `${k} = ?`).join(', ');
    if (!set) return;
    await query(`UPDATE cajas SET ${set} WHERE id_caja = ? AND estado = 1`, [...Object.values(data), id]);
  }

  static async close(id: string, usuario_id_cierre: string) {
    const caja = await query<any[]>('SELECT * FROM cajas WHERE id_caja = ? AND estado = 1', [id]);
    if (caja.length === 0) throw new Error('Caja no encontrada o ya cerrada');

    const c = caja[0];
    const montoCierre = Number(c.monto_apertura || 0) + Number(c.efectivo || 0) + 
                        Number(c.tarjeta || 0) + Number(c.transferencia || 0) - Number(c.devolucion || 0);

    await closeNonAdminSessions();
    const now = getNowInBusinessTimezone();
    await query(`UPDATE cajas SET usuario_id_cierre = ?, fecha_cierre = ?, monto_cierre = ?, estado = 0 WHERE id_caja = ?`, [usuario_id_cierre, now, montoCierre, id]);
  }

  static async delete(id: string) {
    await query('UPDATE cajas SET estado = -1 WHERE id_caja = ? AND estado = 0', [id]);
  }
}
