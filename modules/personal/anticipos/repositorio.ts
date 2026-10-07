/**
 * Infraestructura del módulo Personal para anticipos — SQL privado.
 *
 * Vive dentro del módulo y nadie de fuera puede importarlo: la puerta
 * `modulo-solo-api-publica` falla ante cualquier import externo. Es el antiguo
 * `lib/repositories/anticipo/AnticipoQueries.ts` movido verbatim: otorgar y
 * entregar abren su propia transacción (tocan caja), y los avisos de WhatsApp,
 * SSE y push salen con `void`/`.catch`, después de confirmar — igual que antes,
 * porque moverlos sería un cambio funcional, no de arquitectura.
 *
 * Deuda conocida, heredada y anotada:
 * - `otorgarAnticipo` y `entregarAnticipo` escriben `cajas` vía
 *   `CashRegisterRepository`: coordinación entre módulos que la Fase 5/6 subirá
 *   a un workflow.
 * - `procesarSolicitud` cierra también la gratificación vinculada al mismo id:
 *   intra-módulo (personal), se reordena cuando migre gratificaciones.
 * - `getAnticipoBalances` se mudó a `modules/personal/balances` en el corte 12;
 *   este archivo lo importa de allí, dentro del mismo módulo.
 */
import { getAnticipoBalances } from '../balances/repositorio';
import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { obtenerCajaActiva, registrarMovimientoCobro, leerFondoCaja } from '@/modules/caja';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { enviarWhatsApp } from '@/modules/comunicaciones';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import { logger } from '@/lib/utils/logger';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import {
  buildAnticipoRequestMessage,
  buildAnticipoProcessedMessages
} from '@/lib/notifications/notificationMessages';
import { BaseRepository } from '@/lib/database/base-repository';
import { sendPushByRole, sendPushNotification } from '@/modules/comunicaciones';
import { NotFoundError, BusinessError, DatabaseError } from '@/lib/errors/errors';

const TABLE = 'anticipos';
const ID_COL = 'id_anticipo';

export async function getAllAnticipos(params?: {
  estado?: number;
  usuario_id?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: any[]; total: number }> {
  try {
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
      where += ' AND A.fecha_crea >= ? AND A.fecha_crea < ?';
      sqlParams.push(params.startDate + ' 00:00:00', params.endDate + ' 23:59:59');
    }

    const countSql = `SELECT COUNT(*) as total FROM ${TABLE} A ${where}`;
    const dataSql = `
      SELECT
        A.${ID_COL},
        A.usuario_id,
        COALESCE(U.nombre, '') AS name,
        COALESCE(U.nombre, '') AS nombre,
        COALESCE(U.apellido, '') AS "lastName",
        COALESCE(U.apellido, '') AS apellido,
        COALESCE(U.nick, '') AS nick,
        U.foto,
        A.fecha_crea,
        A.fecha_mod,
        A.fecha_aprobacion,
        A.fecha_cobro,
        A.monto,
        A.motivo,
        A.estado,
        A.entregado_por,
        A.fecha_entrega,
        COALESCE(E.nombre, '') AS entregado_por_nombre,
        COALESCE(E.apellido, '') AS entregado_por_apellido
      FROM ${TABLE} A
      LEFT JOIN usuarios U ON U.id_usuario = A.usuario_id
      LEFT JOIN usuarios E ON E.id_usuario = A.entregado_por
      ${where}
      ORDER BY A.fecha_crea DESC
      LIMIT ? OFFSET ?
    `;

    const countRes = await query<any[]>(countSql, sqlParams);
    const total = Number(countRes[0]?.total ?? 0);
    const data = await query<any[]>(dataSql, [...sqlParams, limit, offset]);

    return { data, total };
  } catch (err) {
    logger.error('[AnticipoQueries] Error en getAllAnticipos:', { err });
    throw new DatabaseError('Error al obtener lista de anticipos', err);
  }
}

export async function getAnticiposByUser(usuario_id: string, startDate?: string, endDate?: string) {
  try {
    let sql = `
    SELECT
      A.*,
      COALESCE(U.nombre, '') AS name,
      COALESCE(U.nombre, '') AS nombre,
      COALESCE(U.apellido, '') AS "lastName",
      COALESCE(U.apellido, '') AS apellido,
      COALESCE(U.nick, '') AS nick,
      U.foto
    FROM ${TABLE} A
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
  } catch (err) {
    logger.error('[AnticipoQueries] Error en getAnticiposByUser:', { usuario_id, err });
    throw new DatabaseError(`Error al obtener anticipos del usuario ${usuario_id}`, err);
  }
}

export async function getAnticiposByDates(usuario_id: string, dates: string[]) {
  try {
    if (dates.length === 0) return [];
    return await query(
      `
    SELECT * FROM ${TABLE}
    WHERE usuario_id = ? AND DATE(fecha_crea) IN (?)
    ORDER BY fecha_crea DESC
  `,
      [usuario_id, dates]
    );
  } catch (err) {
    logger.error('[AnticipoQueries] Error en getAnticiposByDates:', { usuario_id, err });
    throw new DatabaseError(`Error al obtener anticipos por fechas del usuario ${usuario_id}`, err);
  }
}

/** Solicitudes activas (estados 1, 2 y 3) del usuario, con nombre y nick. */
export async function listarSolicitudesDeUsuario(usuario_id: string) {
  try {
    return await query(
      `SELECT A.*, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS usuario_nombre, U.nick
     FROM anticipos A
     INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
     WHERE A.usuario_id = ? AND A.estado IN (1, 2, 3)
     ORDER BY A.fecha_crea DESC`,
      [usuario_id]
    );
  } catch (err) {
    logger.error('[AnticipoQueries] Error en listarSolicitudesDeUsuario:', { usuario_id, err });
    throw new DatabaseError(
      `Error al obtener solicitudes de anticipo del usuario ${usuario_id}`,
      err
    );
  }
}

export async function grantAnticipo(
  usuario_id: string,
  monto: number,
  motivo: string = 'Anticipo otorgado desde administración',
  device_date: string | undefined,
  adminId: string | number | undefined,
  contexto: ContextoOperacion,
  aplazar: (tarea: () => void | Promise<void>) => void
) {
  try {
    const { montoMaximo } = await getAnticipoBalances(usuario_id);
    if (monto > montoMaximo)
      throw new BusinessError(
        `Monto máximo disponible: ${formatCurrencyCLP(montoMaximo)}`,
        'MONTO_EXCEDE_MAXIMO'
      );

    {
      const trx = resolverTransaccion(contexto);
      const id = generateUUID();
      const now = getNowInBusinessTimezone(device_date);
      const deliveredById = adminId ? String(adminId) : undefined;

      await BaseRepository.insert(trx, TABLE, {
        [ID_COL]: id,
        usuario_id,
        monto,
        motivo,
        estado: 1,
        fecha_crea: now,
        fecha_aprobacion: now,
        entregado_por: deliveredById,
        fecha_entrega: now
      });

      // OPTIMIZACIÓN: Batch insert multi-row (antes 3 queries individuales)
      const historialRows = [
        { anticipo_id: id, accion: 'solicitud', usuario_id, fecha_crea: now },
        { anticipo_id: id, accion: 'aprobado', usuario_id: deliveredById, fecha_crea: now },
        { anticipo_id: id, accion: 'entregado', usuario_id: deliveredById, fecha_crea: now }
      ];
      const cols = ['anticipo_id', 'accion', 'usuario_id', 'fecha_crea'];
      const ph = historialRows.map(() => `(${cols.map(() => '?').join(', ')})`).join(', ');
      const vals = historialRows.flatMap(row => cols.map(col => row[col as keyof typeof row]));
      await trx(`INSERT INTO anticipo_historial (${cols.join(', ')}) VALUES ${ph}`, vals);

      const idCaja = await obtenerCajaActiva(contexto);
      if (!idCaja)
        throw new BusinessError(
          'No hay una caja abierta para procesar el anticipo',
          'NO_CAJA_ABIERTA'
        );

      const caja = await leerFondoCaja(idCaja, contexto);
      const efectivoTotal = Number(caja?.monto_apertura || 0) + Number(caja?.efectivo || 0);
      if (!caja || efectivoTotal < monto)
        throw new BusinessError('No hay suficiente efectivo en caja', 'SALDO_CAJA_INSUFICIENTE');

      await registrarMovimientoCobro(idCaja, { efectivo: -monto, anticipo: monto }, contexto);

      aplazar(async () => {
        const userRes = await query<any[]>(
          'SELECT nombre, apellido, nick, telefono FROM usuarios WHERE id_usuario = ?',
          [usuario_id]
        );
        if (userRes.length > 0) {
          const user = userRes[0];

          const confirmMsg = `*Anticipo Otorgado* ✅\n\nHola ${user.nombre}, se ha registrado un anticipo por *${formatCurrencyCLP(monto)}*.\n\n*Motivo:* ${motivo}\n*Fecha:* ${now}`;
          if (user.telefono) {
            enviarWhatsApp(user.telefono, confirmMsg).catch(err =>
              logger.error('[AnticipoQueries] Error enviando WhatsApp confirmación:', { err })
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
          ).catch(err => logger.error('[AnticipoQueries] Error enviando push:', { err }));
        }
      });

      return await BaseRepository.findOne<any>(trx, TABLE, ID_COL, id);
    }
  } catch (err) {
    logger.error('[AnticipoQueries] Error en grantAnticipo:', { usuario_id, monto, err });
    if (err instanceof BusinessError || err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Error al otorgar anticipo para usuario ${usuario_id}`, err);
  }
}

export async function requestAnticipo(
  usuario_id: string,
  monto: number,
  motivo: string,
  device_date?: string,
  solicitadoPor?: string
) {
  try {
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

    await BaseRepository.insert(query, TABLE, {
      [ID_COL]: id,
      usuario_id,
      monto,
      motivo,
      estado: 2,
      fecha_crea: now
    });

    await BaseRepository.insert(query, 'anticipo_historial', {
      anticipo_id: id,
      accion: 'solicitud',
      usuario_id: solicitadoPor ?? usuario_id,
      fecha_crea: now
    });

    const adminWhatsApp = await getAdminWhatsApp();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
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

    try {
      await enviarWhatsApp(adminWhatsApp, msg);
    } catch (err) {
      logger.error('[AnticipoQueries] Error enviando WhatsApp al admin:', { err });
    }

    if (user.telefono) {
      const userMsg = `*Solicitud de Anticipo Recibida* ⏳\n\nHola ${user.nombre}, hemos recibido tu solicitud de anticipo por *${formatCurrencyCLP(monto)}*. Te notificaremos una vez que el administrador la revise.\n\n*Motivo:* ${motivo}\n*Fecha:* ${now}`;
      enviarWhatsApp(user.telefono, userMsg).catch(err =>
        logger.error('[AnticipoQueries] Error enviando WhatsApp de confirmación al empleado:', {
          err
        })
      );
    }

    sendNotificationToAll('new_anticipo_request', {
      id,
      usuario_id,
      monto,
      motivo,
      empleado: `${user.nombre} ${user.apellido}`,
      nick: user.nick,
      fecha_crea: now
    });

    sendPushByRole(
      'cajero',
      'Nueva solicitud de anticipo',
      `${user.nick} solicito ${formatCurrencyCLP(monto)}`
    ).catch(err => logger.error('[AnticipoQueries] Error enviando push al cajero:', { err }));

    sendPushByRole(
      'administrador',
      'Nueva solicitud de anticipo',
      `${user.nombre} ${user.apellido} (${user.nick}) solicitó ${formatCurrencyCLP(monto)}.`
    ).catch(err =>
      logger.error('[AnticipoQueries] Error enviando push al administrador:', { err })
    );

    sendPushNotification(
      usuario_id,
      'Solicitud de anticipo recibida ⏳',
      `Tu solicitud por ${formatCurrencyCLP(monto)} ha sido enviada para revisión.`
    ).catch(err => logger.error('[AnticipoQueries] Error enviando push al empleado:', { err }));

    // OPTIMIZACIÓN: Devolver datos conocidos (antes SELECT redundante post-INSERT)
    return {
      id_anticipo: id,
      usuario_id,
      monto,
      motivo,
      estado: 2,
      fecha_crea: now
    };
  } catch (err) {
    logger.error('[AnticipoQueries] Error en requestAnticipo:', { usuario_id, monto, err });
    if (err instanceof NotFoundError || err instanceof BusinessError) throw err;
    throw new DatabaseError(`Error al solicitar anticipo para usuario ${usuario_id}`, err);
  }
}

export async function updateAnticipoStatus(id: string, estado: number, adminId?: string) {
  try {
    const now = getNowInBusinessTimezone();
    await BaseRepository.update(query, TABLE, ID_COL, id, {
      estado,
      fecha_mod: now
    });

    await BaseRepository.insert(query, 'anticipo_historial', {
      anticipo_id: id,
      accion: mapEstadoToAccion(estado),
      usuario_id: adminId,
      fecha_crea: now
    });

    return await BaseRepository.findOne<any>(query, TABLE, ID_COL, id);
  } catch (err) {
    logger.error('[AnticipoQueries] Error en updateAnticipoStatus:', { id, estado, err });
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Error al actualizar estado de anticipo ${id}`, err);
  }
}

export async function processSolicitudAnticipo(
  id: string,
  action: 'approve' | 'reject',
  adminId?: string,
  montoEsperado?: number
) {
  try {
    const estado = action === 'approve' ? 1 : 3;
    const now = getNowInBusinessTimezone();

    return await withTransaction(async trx => {
      const request = await trx<any[]>(
        `
      SELECT a.*, u.nombre, u.apellido, u.nick, u.telefono, u.push_token
      FROM anticipos a
      INNER JOIN usuarios u ON a.usuario_id = u.id_usuario
      WHERE a.id_anticipo = ? FOR UPDATE OF a
    `,
        [id]
      );

      if (request.length === 0) throw new NotFoundError('Solicitud de anticipo', id);
      const sol = request[0];
      if (montoEsperado !== undefined && Number(sol.monto) !== montoEsperado)
        throw new BusinessError('El monto cambió; consulta el detalle nuevamente');

      if (Number(sol.estado) !== 2)
        throw new BusinessError(
          'La solicitud ya fue procesada anteriormente',
          'ANTICIPO_YA_PROCESADO'
        );

      await BaseRepository.update(trx, TABLE, ID_COL, id, {
        estado,
        fecha_mod: now,
        ...(action === 'approve' ? { fecha_aprobacion: now } : {})
      });

      await BaseRepository.insert(trx, 'anticipo_historial', {
        anticipo_id: id,
        accion: action === 'approve' ? 'aprobado' : 'rechazado',
        usuario_id: adminId,
        fecha_crea: now
      });

      const gratCheck = await trx<any[]>('SELECT estado FROM gratificaciones WHERE id = ?', [id]);
      if (gratCheck.length > 0 && Number(gratCheck[0].estado) === 2) {
        await BaseRepository.update(trx, 'gratificaciones', 'id', id, {
          estado,
          fecha_mod: now
        });
      }

      const { empleado: msgEmp, administrador: msgAdmin } = buildAnticipoProcessedMessages({
        action: action === 'approve' ? 'approved' : 'rejected',
        empleadoNombre: `${sol.nombre} ${sol.apellido}`,
        monto: Number(sol.monto),
        fecha: new Date(now.replace(' ', 'T'))
      });

      const adminWhatsApp = await getAdminWhatsApp();

      try {
        await Promise.all([
          enviarWhatsApp(sol.telefono || '', msgEmp),
          enviarWhatsApp(adminWhatsApp, msgAdmin)
        ]);
      } catch (e) {
        logger.error('[AnticipoQueries] Error enviando WhatsApps:', { e });
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
  } catch (err) {
    logger.error('[AnticipoQueries] Error en processSolicitudAnticipo:', { id, action, err });
    if (err instanceof NotFoundError || err instanceof BusinessError) throw err;
    throw new DatabaseError(`Error al procesar solicitud de anticipo ${id}`, err);
  }
}

export async function deliverAnticipo(
  id: string,
  entregado_por: string,
  contexto: ContextoOperacion,
  aplazar: (tarea: () => void | Promise<void>) => void,
  montoEsperado?: number
) {
  try {
    const now = getNowInBusinessTimezone();

    {
      const trx = resolverTransaccion(contexto);
      const request = await trx<any[]>(
        `
      SELECT a.*, u.nombre, u.apellido, u.nick
      FROM anticipos a
      INNER JOIN usuarios u ON a.usuario_id = u.id_usuario
      WHERE a.id_anticipo = ? FOR UPDATE OF a
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

      if (sol.fecha_entrega || sol.entregado_por)
        throw new BusinessError('El anticipo ya fue entregado', 'ANTICIPO_YA_ENTREGADO');
      if (montoEsperado !== undefined && Number(sol.monto) !== montoEsperado)
        throw new BusinessError('El monto cambió; consulta el detalle nuevamente');

      const idCaja = await obtenerCajaActiva(contexto);
      if (!idCaja)
        throw new BusinessError(
          'No hay una caja abierta para entregar el anticipo',
          'NO_CAJA_ABIERTA'
        );

      const caja = await leerFondoCaja(idCaja, contexto);
      const efectivoTotal = Number(caja?.monto_apertura || 0) + Number(caja?.efectivo || 0);
      if (!caja || efectivoTotal < Number(sol.monto)) {
        throw new BusinessError('No hay suficiente efectivo en caja', 'SALDO_CAJA_INSUFICIENTE');
      }

      const montoAnticipo = Number(sol.monto);
      await registrarMovimientoCobro(
        idCaja,
        { efectivo: -montoAnticipo, anticipo: montoAnticipo },
        contexto
      );

      await BaseRepository.update(trx, TABLE, ID_COL, id, {
        fecha_mod: now,
        entregado_por: String(entregado_por),
        fecha_entrega: now
      });

      await BaseRepository.insert(trx, 'anticipo_historial', {
        anticipo_id: id,
        accion: 'entregado',
        usuario_id: String(entregado_por),
        fecha_crea: now
      });

      aplazar(async () => {
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
      });

      return { ok: true, id };
    }
  } catch (err) {
    logger.error('[AnticipoQueries] Error en deliverAnticipo:', { id, entregado_por, err });
    if (err instanceof NotFoundError || err instanceof BusinessError) throw err;
    throw new DatabaseError(`Error al entregar anticipo ${id}`, err);
  }
}

/**
 * Anticipos solicitados y sin resolver, para el comando de WhatsApp del
 * administrador. El nombre viene concatenado porque es lo que se le responde.
 */
export async function listarAnticiposPendientes(): Promise<
  {
    id: string;
    monto: number | string;
    empleado_nombre: string;
    empleado_nick: string | null;
    fecha_mod: string;
  }[]
> {
  return await query<
    {
      id: string;
      monto: number | string;
      empleado_nombre: string;
      empleado_nick: string | null;
      fecha_mod: string;
    }[]
  >(
    `SELECT a.id_anticipo as id, a.monto, (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) as empleado_nombre, u.nick as empleado_nick, a.fecha_crea as fecha_mod FROM anticipos a INNER JOIN usuarios u ON a.usuario_id = u.id_usuario WHERE a.estado = 2 ORDER BY a.fecha_crea DESC`
  );
}

/**
 * ¿El usuario tiene una solicitud en estado pendiente (2)? La ruta de anticipo
 * máximo la usa para no ofrecer un segundo botón de solicitud mientras la
 * anterior no se resuelve.
 */
export async function tieneSolicitudPendiente(usuarioId: string): Promise<boolean> {
  const rows = await query<{ count: string | number }[]>(
    'SELECT COUNT(*) as count FROM anticipos WHERE usuario_id = ? AND estado = 2',
    [usuarioId]
  );
  return Number(rows[0]?.count || 0) > 0;
}

/**
 * Solicitud de anticipo con su usuario, para la vista pública de confirmación.
 * El nombre viene concatenado en SQL porque así lo devolvía la ruta y el
 * consumidor (WhatsApp y la página) muestra un solo campo.
 */
export async function obtenerSolicitudAnticipoPorId(id_anticipo: string) {
  return await query<any[]>(
    `SELECT A.id_anticipo, A.usuario_id, A.monto, A.motivo, A.estado, A.fecha_crea,
            (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS usuario, U.nick
     FROM anticipos A
     INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
     WHERE A.id_anticipo = ?`,
    [id_anticipo]
  );
}

function mapEstadoToAccion(estado: number): string {
  switch (estado) {
    case 0:
      return 'anulado';
    case 1:
      return 'aprobado';
    case 2:
      return 'pendiente';
    case 3:
      return 'rechazado';
    default:
      return 'actualizado';
  }
}
