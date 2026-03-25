import { query, generateUUID, withTransaction } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { getAnticipoBalances } from '@/lib/anticiposUtils';
import { enviarWhatsApp } from '@/lib/whatsappService';
import { sendNotificationToAll } from '@/lib/sseService';
import { formatCurrencyCLP } from '@/lib/formatters';
import { buildAnticipoRequestMessage } from '@/lib/notificationMessages';

export class AnticipoRepository {
  static async getAll() {
    return await query(`
      SELECT A.id_anticipo, U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario_nombre, A.fecha_crea, A.monto, A.estado
      FROM anticipos A
      INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
      ORDER BY A.fecha_crea DESC
    `);
  }

  static async getByUser(usuario_id: string, startDate?: string, endDate?: string) {
    let sql = 'SELECT * FROM anticipos WHERE usuario_id = ?';
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
      SELECT * FROM anticipos 
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
      await trx("INSERT INTO anticipos (id_anticipo, usuario_id, monto, fecha_crea) VALUES (?, ?, ?, ?)", [id, usuario_id, monto, now]);

      const cajaResult = await trx<any[]>(`
        SELECT id_caja, efectivo, anticipo FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1
      `);
      const caja = cajaResult[0];
      if (!caja) throw new Error("No hay una caja abierta para procesar el anticipo");
      if (Number(caja.efectivo || 0) < monto) throw new Error("No hay suficiente efectivo en caja");

      const nuevoEfectivo = Number(caja.efectivo) - monto;
      const nuevoAnticipo = Number(caja.anticipo || 0) + monto;

      await trx(`UPDATE cajas SET efectivo = ?, anticipo = ? WHERE id_caja = ?`, [nuevoEfectivo, nuevoAnticipo, caja.id_caja]);

      return { efectivo_restante: nuevoEfectivo, anticipo_total: nuevoAnticipo };
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
    await query(`INSERT INTO anticipos (id_anticipo, usuario_id, monto, estado, fecha_crea) VALUES (?, ?, ?, 2, ?)`, [id, usuario_id, monto, now]);

    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    const msg = buildAnticipoRequestMessage({
      nombreCompleto: `${user.nombre} ${user.apellido}`,
      usuarioNick: user.nick,
      montoSolicitado: monto,
      motivo, montoAsistencia, montoComision, montoPropina, montoMaximo,
      anticipoId: id, fecha: new Date()
    });

    await enviarWhatsApp(adminWhatsApp, msg);
    sendNotificationToAll('new_anticipo_request', { id, monto, empleado: `${user.nombre} ${user.apellido}`, nick: user.nick });

    return id;
  }

  static async update(id: string, estado: number) {
    const now = getNowInBusinessTimezone();
    await query("UPDATE anticipos SET estado = ?, fecha_mod = ? WHERE id_anticipo = ?", [estado, now, id]);
  }
}
