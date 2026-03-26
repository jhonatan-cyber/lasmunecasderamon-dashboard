import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { getAnticipoBalances } from '@/lib/business/anticiposUtils';
import { enviarWhatsApp } from '@/lib/integrations/whatsappService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { buildAnticipoRequestMessage } from '@/lib/notifications/notificationMessages';
import { CashRegisterRepository } from './CashRegisterRepository';
import { BaseRepository } from './BaseRepository';

export class AnticipoRepository {
  private static readonly TABLE = 'anticipos';
  private static readonly ID_COL = 'id_anticipo';

  static async getAll() {
    return await query(`
      SELECT A.${this.ID_COL}, U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario_nombre, A.fecha_crea, A.monto, A.estado
      FROM ${this.TABLE} A
      INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
      ORDER BY A.fecha_crea DESC
    `);
  }

  static async getByUser(usuario_id: string, startDate?: string, endDate?: string) {
    let sql = `SELECT * FROM ${this.TABLE} WHERE usuario_id = ?`;
    const params: any[] = [usuario_id];
    if (startDate && endDate) {
      sql += ' AND DATE(fecha_crea) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    sql += ' ORDER BY fecha_crea DESC';
    return await query(sql, params);
  }

  static async getByDates(usuario_id: string, dates: string[]) {
    if (dates.length === 0) return [];
    return await query(`
      SELECT * FROM ${this.TABLE} 
      WHERE usuario_id = ? AND DATE(fecha_crea) IN (?)
      ORDER BY fecha_crea DESC
    `, [usuario_id, dates]);
  }

  static async grant(usuario_id: string, monto: number) {
    const { montoMaximo } = await getAnticipoBalances(usuario_id);
    if (monto > montoMaximo) throw new Error(`Monto máximo disponible: ${formatCurrencyCLP(montoMaximo)}`);

    return await withTransaction(async (trx) => {
      const id = generateUUID();
      const now = getNowInBusinessTimezone();
      
      await BaseRepository.insert(trx, this.TABLE, {
        [this.ID_COL]: id,
        usuario_id,
        monto,
        fecha_crea: now
      });

      const idCaja = await CashRegisterRepository.getCurrentCajaId(trx);
      if (!idCaja) throw new Error("No hay una caja abierta para procesar el anticipo");

      const caja = await CashRegisterRepository.getById(idCaja);
      if (!caja || Number(caja.efectivo || 0) < monto) throw new Error("No hay suficiente efectivo en caja");

      await CashRegisterRepository.updateBalances(trx, idCaja, {
        efectivo: -monto,
        anticipo: monto
      });

      return await BaseRepository.findOne<any>(trx, this.TABLE, this.ID_COL, id);
    });
  }

  static async request(usuario_id: string, monto: number, motivo: string) {
    const userRes = await query<any[]>('SELECT nombre, apellido, nick, telefono FROM usuarios WHERE id_usuario = ?', [usuario_id]);
    if (userRes.length === 0) throw new Error('Usuario no encontrado');
    const user = userRes[0];

    const pending = await query<any[]>('SELECT COUNT(*) as count FROM anticipos WHERE usuario_id = ? AND estado = 2', [usuario_id]);
    if (Number(pending[0].count) > 0) throw new Error('Ya tienes una solicitud de anticipo pendiente.');

    const { montoAsistencia, montoComision, montoPropina, montoMaximo } = await getAnticipoBalances(usuario_id);
    if (monto > montoMaximo) throw new Error(`El monto excede el máximo (${formatCurrencyCLP(montoMaximo)})`);

    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    
    await BaseRepository.insert(query, this.TABLE, {
      [this.ID_COL]: id,
      usuario_id,
      monto,
      estado: 2,
      fecha_crea: now
    });

    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    const msg = buildAnticipoRequestMessage({
      nombreCompleto: `${user.nombre} ${user.apellido}`,
      usuarioNick: user.nick,
      montoSolicitado: monto,
      motivo, montoAsistencia, montoComision, montoPropina, montoMaximo,
      anticipoId: id, fecha: new Date(now.replace(' ', 'T'))
    });

    await enviarWhatsApp(adminWhatsApp, msg);
    sendNotificationToAll('new_anticipo_request', { id, monto, empleado: `${user.nombre} ${user.apellido}`, nick: user.nick });

    const res = await query<any[]>('SELECT * FROM anticipos WHERE id_anticipo = ?', [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async updateStatus(id: string, estado: number) {
    const now = getNowInBusinessTimezone();
    await BaseRepository.update(query, this.TABLE, this.ID_COL, id, {
      estado,
      fecha_mod: now
    });
    return await BaseRepository.findOne<any>(query, this.TABLE, this.ID_COL, id);
  }
}
