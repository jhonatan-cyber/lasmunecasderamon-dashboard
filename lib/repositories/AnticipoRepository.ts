import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { getAnticipoBalances } from '@/lib/business/anticiposUtils';
import { enviarWhatsApp } from '@/lib/integrations/whatsappService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { buildAnticipoRequestMessage, buildAnticipoProcessedMessages } from '@/lib/notifications/notificationMessages';
import { CashRegisterRepository } from './CashRegisterRepository';
import { BaseRepository } from './BaseRepository';
import { sendPushByRole } from '@/lib/integrations/pushNotifications';

export class AnticipoRepository {
  private static readonly TABLE = 'anticipos';
  private static readonly ID_COL = 'id_anticipo';

  static async getAll() {
    return await query(`
      SELECT 
        A.${this.ID_COL}, 
        A.usuario_id, 
        COALESCE(U.nombre, '') AS name, 
        COALESCE(U.nombre, '') AS nombre, 
        COALESCE(U.apellido, '') AS lastName, 
        COALESCE(U.apellido, '') AS apellido, 
        COALESCE(U.nick, '') AS nick, 
        U.foto, 
        A.fecha_crea, 
        A.monto, 
        A.estado
      FROM ${this.TABLE} A
      LEFT JOIN usuarios U ON U.id_usuario = A.usuario_id
      ORDER BY A.fecha_crea DESC
    `);
  }

  static async getByUser(usuario_id: string, startDate?: string, endDate?: string) {
    let sql = `
      SELECT 
        A.*, 
        COALESCE(U.nombre, '') AS name, 
        COALESCE(U.nombre, '') AS nombre, 
        COALESCE(U.apellido, '') AS lastName, 
        COALESCE(U.apellido, '') AS apellido, 
        COALESCE(U.nick, '') AS nick, 
        U.foto
      FROM ${this.TABLE} A
      LEFT JOIN usuarios U ON U.id_usuario = A.usuario_id
      WHERE A.usuario_id = ?
    `;
    const params: any[] = [usuario_id];
    if (startDate && endDate) {
      sql += ' AND DATE(A.fecha_crea) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    sql += ' ORDER BY A.fecha_crea DESC';
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

  static async grant(usuario_id: string, monto: number, motivo: string = 'Anticipo otorgado desde administración', device_date?: string) {
    const { montoMaximo } = await getAnticipoBalances(usuario_id);
    if (monto > montoMaximo) throw new Error(`Monto máximo disponible: ${formatCurrencyCLP(montoMaximo)}`);

    return await withTransaction(async (trx) => {
      const id = generateUUID();
      const now = getNowInBusinessTimezone(device_date);
      
      await BaseRepository.insert(trx, this.TABLE, {
        [this.ID_COL]: id,
        usuario_id,
        monto,
        motivo,
        estado: 1, // Aprobado directamente
        fecha_crea: now
      });

      const idCaja = await CashRegisterRepository.getCurrentCajaId(trx);
      if (!idCaja) throw new Error("No hay una caja abierta para procesar el anticipo");

      const caja = await CashRegisterRepository.getById(idCaja);
      const efectivoTotal = Number(caja?.monto_apertura || 0) + Number(caja?.efectivo || 0);
      if (!caja || efectivoTotal < monto) throw new Error("No hay suficiente efectivo en caja");

      await CashRegisterRepository.updateBalances(trx, idCaja, {
        efectivo: -monto,
        anticipo: monto
      });

      // Notificaciones inmediatas
      const userRes = await query<any[]>('SELECT nombre, apellido, nick, telefono FROM usuarios WHERE id_usuario = ?', [usuario_id]);
      if (userRes.length > 0) {
        const user = userRes[0];
        
        // 1. WhatsApp al usuario
        const confirmMsg = `*Anticipo Otorgado* ✅\n\nHola ${user.nombre}, se ha registrado un anticipo por *${formatCurrencyCLP(monto)}*.\n\n*Motivo:* ${motivo}\n*Fecha:* ${now}`;
        if (user.telefono) {
          enviarWhatsApp(user.telefono, confirmMsg).catch(console.error);
        }

        // 2. Notificación Web (SSE)
        sendNotificationToAll('ANTICIPO_PROCESSED', {
          id,
          usuario: `${user.nombre} ${user.apellido}`,
          monto,
          estado: 1
        });

        // 3. Push a Cajeros (para sincronía de caja)
        sendPushByRole('cajero', 'Anticipo Otorgado', `Se otorgaron ${formatCurrencyCLP(monto)} a ${user.nick}`).catch(console.error);
      }

      return await BaseRepository.findOne<any>(trx, this.TABLE, this.ID_COL, id);
    });
  }

  static async request(usuario_id: string, monto: number, motivo: string, device_date?: string) {
    const userRes = await query<any[]>('SELECT nombre, apellido, nick, telefono FROM usuarios WHERE id_usuario = ?', [usuario_id]);
    if (userRes.length === 0) throw new Error('Usuario no encontrado');
    const user = userRes[0];

    const pending = await query<any[]>('SELECT COUNT(*) as count FROM anticipos WHERE usuario_id = ? AND estado = 2', [usuario_id]);
    if (Number(pending[0].count) > 0) throw new Error('Ya tienes una solicitud de anticipo pendiente.');

    const { montoAsistencia, montoComision, montoPropina, montoMaximo } = await getAnticipoBalances(usuario_id);
    if (monto > montoMaximo) throw new Error(`El monto excede el máximo (${formatCurrencyCLP(montoMaximo)})`);

    const id = generateUUID();
    const now = getNowInBusinessTimezone(device_date);
    
    await BaseRepository.insert(query, this.TABLE, {
      [this.ID_COL]: id,
      usuario_id,
      monto,
      motivo,
      estado: 2, // Pendiente
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

  static async processSolicitud(id: string, action: 'approve' | 'reject') {
    const estado = action === 'approve' ? 1 : 3;
    const now = getNowInBusinessTimezone();

    return await withTransaction(async (trx) => {
      // 1. Obtener la solicitud con datos del usuario
      const request = await query<any[]>(`
        SELECT a.*, u.nombre, u.apellido, u.nick, u.telefono, u.push_token 
        FROM anticipos a 
        INNER JOIN usuarios u ON a.usuario_id = u.id_usuario 
        WHERE a.id_anticipo = ?
      `, [id]);
      
      if (request.length === 0) throw new Error('Solicitud no encontrada');
      const sol = request[0];

      if (Number(sol.estado) !== 2) throw new Error('La solicitud ya fue procesada anteriormente');

      // 2. Actualizar estado
      await BaseRepository.update(trx, this.TABLE, this.ID_COL, id, {
        estado,
        fecha_mod: now
      });

      // 3. Si se aprueba, actualizar saldos de caja (lógica actual heredada)
      if (action === 'approve') {
        const idCaja = await CashRegisterRepository.getCurrentCajaId(trx);
        if (idCaja) {
          const caja = await CashRegisterRepository.getById(idCaja);
          const efectivoTotal = Number(caja?.monto_apertura || 0) + Number(caja?.efectivo || 0);
          if (caja && efectivoTotal >= Number(sol.monto)) {
            await CashRegisterRepository.updateBalances(trx, idCaja, {
              efectivo: -Number(sol.monto),
              anticipo: Number(sol.monto)
            });
          }
        }
      }

      // 4. Notificaciones
      const { empleado: msgEmp, administrador: msgAdmin } = buildAnticipoProcessedMessages({
        action: action === 'approve' ? 'approved' : 'rejected',
        empleadoNombre: `${sol.nombre} ${sol.apellido}`,
        monto: Number(sol.monto),
        fecha: new Date(now.replace(' ', 'T'))
      });

      const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
      
      // WhatsApp (Silencioso si falla un número)
      try {
        await Promise.all([
          enviarWhatsApp(sol.telefono || '', msgEmp),
          enviarWhatsApp(adminWhatsApp, msgAdmin)
        ]);
      } catch (e) {
        console.error('Error enviando WhatsApps:', e);
      }

      // Notificación Web (SSE)
      sendNotificationToAll('anticipo_processed', {
        id,
        status: action === 'approve' ? 'approved' : 'rejected',
        monto: Number(sol.monto),
        empleado: `${sol.nombre} ${sol.apellido}`,
        nick: sol.nick
      });

      // Notificación Push (Apps Móviles para el Cajero)
      const title = action === 'approve' ? '💰 Anticipo Aceptado' : '❌ Anticipo Rechazado';
      const body = `El anticipo de ${sol.nombre} por ${formatCurrencyCLP(Number(sol.monto))} ha sido ${action === 'approve' ? 'aceptado' : 'rechazado'}.`;
      await sendPushByRole('cajero', title, body, { id_anticipo: id, type: 'anticipo', action });

      return { ok: true, id };
    });
  }
}
