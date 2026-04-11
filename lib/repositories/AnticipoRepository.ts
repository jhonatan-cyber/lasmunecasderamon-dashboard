import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { getAnticipoBalances } from '@/lib/business/anticiposUtils';
import { enviarWhatsApp } from '@/lib/integrations/whatsappService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { logger } from '@/lib/utils/logger';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import {
  buildAnticipoRequestMessage,
  buildAnticipoProcessedMessages
} from '@/lib/notifications/notificationMessages';
import { CashRegisterRepository } from './CashRegisterRepository';
import { BaseRepository } from './BaseRepository';
import { sendPushByRole, sendPushNotification } from '@/lib/integrations/pushNotifications';
import { NotFoundError, BusinessError } from '@/lib/errors/errors';

export class AnticipoRepository {
  private static readonly TABLE = 'anticipos';
  private static readonly ID_COL = 'id_anticipo';

  static async getAll(params?: {
    estado?: number;
    usuario_id?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[]; total: number }> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const sqlParams: any[] = [];

    let where = 'WHERE 1=1';
    if (params?.estado !== undefined) {
      where += ' AND A.estado = ?';
      sqlParams.push(params.estado);
    }
    if (params?.usuario_id) {
      where += ' AND A.usuario_id = ?';
      sqlParams.push(params.usuario_id);
    }
    if (params?.startDate && params?.endDate) {
      where += ' AND DATE(A.fecha_crea) BETWEEN ? AND ?';
      sqlParams.push(params.startDate, params.endDate);
    }

    const countSql = `SELECT COUNT(*) as total FROM ${this.TABLE} A ${where}`;
    const dataSql = `
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
        A.fecha_mod,
        A.monto,
        A.motivo,
        A.estado
      FROM ${this.TABLE} A
      LEFT JOIN usuarios U ON U.id_usuario = A.usuario_id
      ${where}
      ORDER BY A.fecha_crea DESC
      LIMIT ? OFFSET ?
    `;

    const countRes = await query<any[]>(countSql, sqlParams);
    const total = Number(countRes[0]?.total ?? 0);
    const data = await query<any[]>(dataSql, [...sqlParams, limit, offset]);

    return { data, total };
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
    return await query(
      `
      SELECT * FROM ${this.TABLE} 
      WHERE usuario_id = ? AND DATE(fecha_crea) IN (?)
      ORDER BY fecha_crea DESC
    `,
      [usuario_id, dates]
    );
  }

  static async grant(
    usuario_id: string,
    monto: number,
    motivo: string = 'Anticipo otorgado desde administración',
    device_date?: string
  ) {
    const { montoMaximo } = await getAnticipoBalances(usuario_id);
    if (monto > montoMaximo)
      throw new BusinessError(
        `Monto máximo disponible: ${formatCurrencyCLP(montoMaximo)}`,
        'MONTO_EXCEDE_MAXIMO'
      );

    return await withTransaction(async trx => {
      const id = generateUUID();
      const now = getNowInBusinessTimezone(device_date);

      await BaseRepository.insert(trx, this.TABLE, {
        [this.ID_COL]: id,
        usuario_id,
        monto,
        motivo,
        estado: 1,
        fecha_crea: now
      });

      const idCaja = await CashRegisterRepository.getCurrentCajaId(trx);
      if (!idCaja)
        throw new BusinessError(
          'No hay una caja abierta para procesar el anticipo',
          'NO_CAJA_ABIERTA'
        );

      const caja = await CashRegisterRepository.getById(idCaja);
      const efectivoTotal = Number(caja?.monto_apertura || 0) + Number(caja?.efectivo || 0);
      if (!caja || efectivoTotal < monto)
        throw new BusinessError('No hay suficiente efectivo en caja', 'SALDO_CAJA_INSUFICIENTE');

      await CashRegisterRepository.updateBalances(trx, idCaja, {
        efectivo: -monto,
        anticipo: monto
      });

      const userRes = await query<any[]>(
        'SELECT nombre, apellido, nick, telefono FROM usuarios WHERE id_usuario = ?',
        [usuario_id]
      );
      if (userRes.length > 0) {
        const user = userRes[0];

        const confirmMsg = `*Anticipo Otorgado* ✅\n\nHola ${user.nombre}, se ha registrado un anticipo por *${formatCurrencyCLP(monto)}*.\n\n*Motivo:* ${motivo}\n*Fecha:* ${now}`;
        if (user.telefono) {
          enviarWhatsApp(user.telefono, confirmMsg).catch(err =>
            logger.error('[AnticipoRepository] Error enviando WhatsApp confirmación:', { err })
          );
        }

        sendNotificationToAll('ANTICIPO_PROCESSED', {
          id,
          usuario: `${user.nombre} ${user.apellido}`,
          monto,
          estado: 1
        });

        sendPushByRole(
          'cajero',
          'Anticipo Otorgado',
          `Se otorgaron ${formatCurrencyCLP(monto)} a ${user.nick}`
        ).catch(err => logger.error('[AnticipoRepository] Error enviando push:', { err }));
      }

      return await BaseRepository.findOne<any>(trx, this.TABLE, this.ID_COL, id);
    });
  }

  static async request(usuario_id: string, monto: number, motivo: string, device_date?: string) {
    const userRes = await query<any[]>(
      'SELECT nombre, apellido, nick, telefono FROM usuarios WHERE id_usuario = ?',
      [usuario_id]
    );
    if (userRes.length === 0) throw new NotFoundError('Usuario', usuario_id);
    const user = userRes[0];

    const pending = await query<any[]>(
      'SELECT COUNT(*) as count FROM anticipos WHERE usuario_id = ? AND estado = 2',
      [usuario_id]
    );
    if (Number(pending[0].count) > 0)
      throw new BusinessError(
        'Ya tienes una solicitud de anticipo pendiente',
        'ANTICIPO_PENDIENTE'
      );

    const { montoAsistencia, montoComision, montoPropina, montoMaximo } =
      await getAnticipoBalances(usuario_id);
    if (monto > montoMaximo)
      throw new BusinessError(
        `El monto excede el máximo (${formatCurrencyCLP(montoMaximo)})`,
        'MONTO_EXCEDE_MAXIMO'
      );

    const id = generateUUID();
    const now = getNowInBusinessTimezone(device_date);

    await BaseRepository.insert(query, this.TABLE, {
      [this.ID_COL]: id,
      usuario_id,
      monto,
      motivo,
      estado: 2,
      fecha_crea: now
    });

    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    const baseUrl = process.env.PUBLIC_BASE_URL || '';
    const msg = buildAnticipoRequestMessage({
      nombreCompleto: `${user.nombre} ${user.apellido}`,
      usuarioNick: user.nick,
      montoSolicitado: monto,
      motivo,
      montoAsistencia,
      montoComision,
      montoPropina,
      montoMaximo,
      anticipoId: id,
      fecha: new Date(now.replace(' ', 'T')),
      baseUrl,
      token: id
    });

    await enviarWhatsApp(adminWhatsApp, msg);
    sendNotificationToAll('new_anticipo_request', {
      id,
      usuario_id,
      monto,
      motivo,
      empleado: `${user.nombre} ${user.apellido}`,
      nick: user.nick,
      fecha_crea: now
    });

    await sendPushByRole(
      'cajero',
      'Nueva solicitud de anticipo',
      `${user.nick} solicito ${formatCurrencyCLP(monto)}`
    ).catch(err => logger.error('[AnticipoRepository] Error enviando push solicitud:', { err }));

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

    return await withTransaction(async trx => {
      const request = await query<any[]>(
        `
        SELECT a.*, u.nombre, u.apellido, u.nick, u.telefono, u.push_token
        FROM anticipos a
        INNER JOIN usuarios u ON a.usuario_id = u.id_usuario
        WHERE a.id_anticipo = ?
      `,
        [id]
      );

      if (request.length === 0) throw new NotFoundError('Solicitud de anticipo', id);
      const sol = request[0];

      if (Number(sol.estado) !== 2)
        throw new BusinessError(
          'La solicitud ya fue procesada anteriormente',
          'ANTICIPO_YA_PROCESADO'
        );

      await BaseRepository.update(trx, this.TABLE, this.ID_COL, id, {
        estado,
        fecha_mod: now
      });

      const { empleado: msgEmp, administrador: msgAdmin } = buildAnticipoProcessedMessages({
        action: action === 'approve' ? 'approved' : 'rejected',
        empleadoNombre: `${sol.nombre} ${sol.apellido}`,
        monto: Number(sol.monto),
        fecha: new Date(now.replace(' ', 'T'))
      });

      const adminWhatsApp =
        process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';

      try {
        await Promise.all([
          enviarWhatsApp(sol.telefono || '', msgEmp),
          enviarWhatsApp(adminWhatsApp, msgAdmin)
        ]);
      } catch (e) {
        logger.error('[AnticipoRepository] Error enviando WhatsApps:', { e });
      }

      sendNotificationToAll('anticipo_processed', {
        id,
        usuario_id: sol.usuario_id,
        status: action === 'approve' ? 'approved' : 'rejected',
        monto: Number(sol.monto),
        motivo: sol.motivo,
        fecha_mod: now,
        empleado: `${sol.nombre} ${sol.apellido}`,
        nick: sol.nick
      });

      const title = action === 'approve' ? 'Anticipo aceptado' : 'Anticipo rechazado';
      const body = `El anticipo de ${sol.nombre} por ${formatCurrencyCLP(Number(sol.monto))} ha sido ${action === 'approve' ? 'aceptado' : 'rechazado'}.`;

      await sendPushByRole('cajero', title, body, { id_anticipo: id, type: 'anticipo', action });
      await sendPushNotification(sol.usuario_id, title, body, {
        id_anticipo: id,
        type: 'anticipo',
        action
      });

      return { ok: true, id };
    });
  }

  static async deliverAnticipo(id: string) {
    const now = getNowInBusinessTimezone();

    return await withTransaction(async trx => {
      const request = await query<any[]>(
        `
        SELECT a.*, u.nombre, u.apellido, u.nick
        FROM anticipos a
        INNER JOIN usuarios u ON a.usuario_id = u.id_usuario
        WHERE a.id_anticipo = ?
      `,
        [id]
      );

      if (request.length === 0) throw new NotFoundError('Solicitud de anticipo', id);
      const sol = request[0];

      if (Number(sol.estado) !== 1)
        throw new BusinessError(
          'Solo se pueden entregar anticipos aprobados',
          'ANTICIPO_NO_APROBADO'
        );

      const idCaja = await CashRegisterRepository.getCurrentCajaId(trx);
      if (!idCaja)
        throw new BusinessError(
          'No hay una caja abierta para entregar el anticipo',
          'NO_CAJA_ABIERTA'
        );

      const caja = await CashRegisterRepository.getById(idCaja);
      const efectivoTotal = Number(caja?.monto_apertura || 0) + Number(caja?.efectivo || 0);
      if (!caja || efectivoTotal < Number(sol.monto)) {
        throw new BusinessError('No hay suficiente efectivo en caja', 'SALDO_CAJA_INSUFICIENTE');
      }

      const montoAnticipo = Number(sol.monto);
      await CashRegisterRepository.updateBalances(trx, idCaja, {
        efectivo: -montoAnticipo,
        anticipo: montoAnticipo
      });

      await BaseRepository.update(trx, this.TABLE, this.ID_COL, id, {
        estado: 0,
        fecha_mod: now
      });

      sendNotificationToAll('anticipo_delivered', {
        id,
        usuario_id: sol.usuario_id,
        monto: Number(sol.monto),
        fecha_mod: now,
        empleado: `${sol.nombre} ${sol.apellido}`,
        nick: sol.nick
      });

      const title = 'Anticipo entregado';
      const body = `Se entrego ${formatCurrencyCLP(Number(sol.monto))} a ${sol.nombre}.`;

      await sendPushByRole('cajero', title, body, {
        id_anticipo: id,
        type: 'anticipo',
        action: 'delivered'
      });
      await sendPushNotification(sol.usuario_id, title, body, {
        id_anticipo: id,
        type: 'anticipo',
        action: 'delivered'
      });

      return { ok: true, id };
    });
  }
}
