import { query, generateUUID, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { enviarWhatsApp } from '@/lib/integrations/whatsappService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole, sendPushNotification } from '@/lib/integrations/pushNotifications';
import { NotFoundError, BusinessError } from '@/lib/errors/errors';
import { BaseRepository } from './BaseRepository';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

type GratificacionAction = 'approve' | 'reject';

export class GratificacionRepository {
  private static getEstadoTexto(estado: number) {
    switch (Number(estado)) {
      case 0:
        return 'pagado';
      case 1:
        return 'por_pagar';
      case 2:
        return 'pendiente_aprobacion';
      case 3:
        return 'rechazada';
      default:
        return 'desconocido';
    }
  }

  static async getAll(userId?: string) {
    const tableCheck = await query<any[]>("SHOW TABLES LIKE 'gratificaciones'");
    if (tableCheck.length === 0) return [];

let sql = `
      SELECT G.*,
             DATE_FORMAT(G.fecha_crea, "%Y-%m-%d %H:%i:%s") as fecha_crea_fmt,
             DATE_FORMAT(G.fecha_mod, "%Y-%m-%d %H:%i:%s") as fecha_mod_fmt,
             U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario, U.foto AS usuario_foto
      FROM gratificaciones G
      INNER JOIN usuarios U ON U.id_usuario = G.usuario_id
    `;
    const params: any[] = [];
    if (userId) {
      sql += ' WHERE G.usuario_id = ?';
      params.push(userId);
    }
    sql += ' ORDER BY G.fecha_crea DESC';

const rows = await query<any[]>(sql, params);
    return rows.map(row => ({
      id: String(row.id),
      // Compatibilidad hacia el frontend: la DB real no tiene fecha_hora.
      fecha_hora: row.fecha_crea_fmt,
      usuario_id: String(row.usuario_id),
      id_usuario: String(row.id_usuario),
      usuario: String(row.usuario),
      usuario_foto: row.usuario_foto || null,
      monto: Number(row.monto),
      descripcion: String(row.descripcion || ''),
      fecha_crea: row.fecha_crea_fmt,
      fecha_mod: row.fecha_mod_fmt || null,
      estado: Number(row.estado),
      estado_texto: this.getEstadoTexto(Number(row.estado))
    }));
  }

  static async create(data: { usuario_id: string; monto: number; descripcion?: string }) {
    const tableCheck = await query<any[]>("SHOW TABLES LIKE 'gratificaciones'");
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    if (tableCheck.length === 0) return id;

    await BaseRepository.insert(query, 'gratificaciones', {
      id,
      usuario_id: data.usuario_id,
      monto: data.monto,
      descripcion: data.descripcion || '',
      estado: 1,
      fecha_crea: now
    });
    const res = await query<any[]>('SELECT * FROM gratificaciones WHERE id = ?', [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async request(
    targetUserId: string,
    monto: number,
    descripcion: string | undefined,
    requestedByUserId: string
  ) {
    const tableCheck = await query<any[]>("SHOW TABLES LIKE 'gratificaciones'");
    if (tableCheck.length === 0) {
      throw new BusinessError(
        'La tabla de gratificaciones no existe',
        'GRATIFICACIONES_TABLE_MISSING'
      );
    }

    const [targetRows, requesterRows, pendingRows] = await Promise.all([
      query<any[]>(
        `SELECT u.id_usuario, u.nombre, u.apellido, u.nick, u.telefono
         FROM usuarios u
         WHERE u.id_usuario = ?`,
        [targetUserId]
      ),
      query<any[]>(
        `SELECT u.id_usuario, u.nombre, u.apellido, u.nick
         FROM usuarios u
         WHERE u.id_usuario = ?`,
        [requestedByUserId]
      ),
      query<any[]>(
        `SELECT COUNT(*) as count
         FROM gratificaciones
         WHERE usuario_id = ? AND estado = 2`,
        [targetUserId]
      )
    ]);

    if (targetRows.length === 0) throw new NotFoundError('Usuario', targetUserId);
    if (requesterRows.length === 0)
      throw new NotFoundError('Usuario solicitante', requestedByUserId);
    if (Number(pendingRows[0]?.count || 0) > 0) {
      throw new BusinessError(
        'Ya existe una gratificaci?n pendiente para este empleado',
        'GRATIFICACION_PENDIENTE'
      );
    }

    const target = targetRows[0];
    const requester = requesterRows[0];
    const id = generateUUID();
    const now = getNowInBusinessTimezone();

    await BaseRepository.insert(query, 'gratificaciones', {
      id,
      usuario_id: targetUserId,
      monto,
      descripcion: descripcion || '',
      estado: 2,
      fecha_crea: now
    });

    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    const baseUrl = process.env.PUBLIC_BASE_URL || '';
    const confirmUrl = baseUrl
      ? `${baseUrl}/confirmar-gratificacion?token=${encodeURIComponent(id)}`
      : null;

    const message = `*NUEVA SOLICITUD DE GRATIFICACI?N*

*Empleado:* ${target.nombre} ${target.apellido}
*Nick:* ${target.nick || 'Sin nick'}
*Monto:* ${formatCurrencyCLP(monto)}
*Descripci?n:* ${descripcion || 'Sin descripci?n'}
*Solicitado por:* ${requester.nombre} ${requester.apellido}${requester.nick ? ` (@${requester.nick})` : ''}

${
  confirmUrl
    ? `*Para procesar:* ${confirmUrl}

_Haz clic en el link para aprobar o rechazar la solicitud._`
    : `*Para aprobar:* responde "APROBAR GRATIFICACION ${id}"
*Para rechazar:* responde "RECHAZAR GRATIFICACION ${id}"`
}`;

    await enviarWhatsApp(adminWhatsApp, message);

    sendNotificationToAll('new_gratificacion_request', {
      id,
      usuario_id: targetUserId,
      solicitado_por: requestedByUserId,
      monto,
      descripcion: descripcion || '',
      empleado: `${target.nombre} ${target.apellido}`,
      nick: target.nick || null,
      fecha_crea: now
    });

    await sendPushByRole(
      'administrador',
      'Nueva solicitud de gratificaci?n',
      `${requester.nick || requester.nombre} solicit? ${formatCurrencyCLP(monto)} para ${target.nick || target.nombre}`,
      { id_gratificacion: id, type: 'gratificacion', action: 'requested' }
    ).catch(() => undefined);

    const created = await query<any[]>('SELECT * FROM gratificaciones WHERE id = ?', [id]);
    return created.length > 0 ? created[0] : null;
  }

  static async getSolicitudDetalle(id: string) {
    const rows = await query<any[]>(
      `
      SELECT
        g.id,
        g.monto,
        g.descripcion,
        g.estado,
        g.fecha_crea,
        u.nombre,
        u.apellido,
        u.nick
      FROM gratificaciones g
      INNER JOIN usuarios u ON u.id_usuario = g.usuario_id
      WHERE g.id = ?
      LIMIT 1
    `,
      [id]
    );

    if (rows.length === 0) throw new NotFoundError('Solicitud de gratificaci?n', id);

    const row = rows[0];
    if (Number(row.estado) !== 2) {
      throw new BusinessError(
        'La solicitud ya fue procesada anteriormente',
        'GRATIFICACION_YA_PROCESADA'
      );
    }

    return {
      id: row.id,
      usuario: `${row.nombre} ${row.apellido}`.trim(),
      nick: row.nick || '',
      monto: Number(row.monto || 0),
      descripcion: row.descripcion || '',
      fecha: row.fecha_crea
    };
  }

  static async processSolicitud(id: string, action: GratificacionAction) {
    return await withTransaction(async trx => {
      const rows = await query<any[]>(
        `
        SELECT
          g.id,
          g.usuario_id,
          g.monto,
          g.descripcion,
          g.estado,
          u.nombre,
          u.apellido,
          u.nick,
          u.telefono
        FROM gratificaciones g
        INNER JOIN usuarios u ON u.id_usuario = g.usuario_id
        WHERE g.id = ?
        LIMIT 1
      `,
        [id]
      );

      if (rows.length === 0) throw new NotFoundError('Solicitud de gratificaci?n', id);

      const solicitud = rows[0];
      if (Number(solicitud.estado) !== 2) {
        throw new BusinessError(
          'La solicitud ya fue procesada anteriormente',
          'GRATIFICACION_YA_PROCESADA'
        );
      }

      const now = getNowInBusinessTimezone();
      const nextState = action === 'approve' ? 1 : 3;

      await BaseRepository.update(trx, 'gratificaciones', 'id', id, {
        estado: nextState,
        fecha_mod: now
      });

      const approved = action === 'approve';
      const title = approved ? 'Gratificaci?n aprobada' : 'Gratificaci?n rechazada';
      const employeeName = `${solicitud.nombre} ${solicitud.apellido}`.trim();
      const amountText = formatCurrencyCLP(Number(solicitud.monto || 0));
      const employeeMessage = `*${title.toUpperCase()}*

Hola ${employeeName}, tu gratificaci?n por *${amountText}* ha sido *${approved ? 'aprobada' : 'rechazada'}*.

${
  solicitud.descripcion
    ? `*Descripci?n:* ${solicitud.descripcion}
`
    : ''
}${approved ? 'Qued? registrada como pendiente de pago.' : 'Si necesit?s m?s informaci?n, habl? con administraci?n.'}`;

      const adminWhatsApp =
        process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
      const adminMessage = `*${title.toUpperCase()}*

*Empleado:* ${employeeName}
*Monto:* ${amountText}
*Solicitud:* ${id}`;

      await Promise.allSettled([
        solicitud.telefono
          ? enviarWhatsApp(solicitud.telefono, employeeMessage)
          : Promise.resolve(true),
        enviarWhatsApp(adminWhatsApp, adminMessage),
        sendPushByRole('cajero', title, `${employeeName} ? ${amountText}`, {
          id_gratificacion: id,
          type: 'gratificacion',
          action
        }),
        sendPushNotification(solicitud.usuario_id, title, `${amountText}`, {
          id_gratificacion: id,
          type: 'gratificacion',
          action
        })
      ]);

      sendNotificationToAll('gratificacion_processed', {
        id,
        usuario_id: solicitud.usuario_id,
        monto: Number(solicitud.monto || 0),
        estado: nextState,
        accion: action,
        empleado: employeeName,
        nick: solicitud.nick || null,
        fecha_mod: now
      });

      return { ok: true, id, estado: nextState };
    });
  }

  static async update(id: string, data: { monto: number; descripcion?: string }) {
    const now = getNowInBusinessTimezone();
    await BaseRepository.update(query, 'gratificaciones', 'id', id, {
      ...data,
      fecha_mod: now
    });
    const res = await query<any[]>('SELECT * FROM gratificaciones WHERE id = ?', [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async delete(id: string) {
    await BaseRepository.delete(query, 'gratificaciones', 'id', id);
  }
}
