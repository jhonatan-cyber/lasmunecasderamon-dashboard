import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone, parseBusinessDate } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { CashRegisterRepository } from './CashRegisterRepository';
import { BaseRepository } from './BaseRepository';
import { NotFoundError, BusinessError } from '@/lib/errors/errors';
import { RoomManager } from '@/lib/services/RoomManager';

// ─── Input types for CuentaRepository ───────────────────────────────────────

type CuentaDetalle = {
  producto_id: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
  hostesses?: (string | null)[];
  isChampagne?: boolean;
};

type CuentaCreateBody = {
  codigo: string;
  cliente_id?: string | null;
  total_comision: number;
  habitacion_id?: string | null;
  habitacion_nombre?: string;
  sub_total: number;
  total: number;
  propina?: number;
  tiempo?: number;
  detalles: CuentaDetalle[];
  usuarios?: string[];
};

type CuentaUpdateBody = {
  estado?: number;
  detalles?: CuentaDetalle[];
  usuarios?: string[];
  extraTiempo?: number;
  habitacion_id?: string | null;
  tiempo?: number;
};

type CuentaCobrarBody = {
  montoFinal?: number;
  total_cobrado?: number;
  propinaFinal?: number;
  propina?: number;
  tipoPago?: string;
  metodoPago?: string;
  metodo_pago?: string;
  habitacion_id?: string | null;
};

type CuentaRoomHistoryItem = {
  roomId: string;
  roomName: string;
  startedAt: string;
  endedAt: string | null;
  assignedMinutes: number;
  consumedMinutes: number;
  remainingMinutes?: number;
  carriedFromPrevious?: boolean;
  closedReason?: 'expired' | 'manual' | 'charged' | 'cancelled' | 'changed_room';
};

type CuentaRoomHistoryViewItem = CuentaRoomHistoryItem & {
  remainingMinutes: number;
  isActive: boolean;
};

type CuentaAnulacionRow = {
  id: string;
  monto: number;
  motivo: string | null;
  estado: string;
  fecha_crea: string;
  fecha_mod: string | null;
  requested_by_nombre: string | null;
  approved_by_nombre: string | null;
};

export class CuentaRepository {
  private static readonly TABLE = 'cuentas';
  private static readonly ID_COL = 'id_cuenta';

  private static parseRoomHistory(raw: any): CuentaRoomHistoryItem[] {
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private static stringifyRoomHistory(history: CuentaRoomHistoryItem[]): string | null {
    return history.length ? JSON.stringify(history) : null;
  }

  private static getCurrentTimerDuration(cuenta: any): number {
    if (cuenta && Object.prototype.hasOwnProperty.call(cuenta, 'tiempo_actual')) {
      const current = Number(cuenta?.tiempo_actual);
      return Number.isFinite(current) ? Math.max(0, current) : 0;
    }

    return Number(cuenta?.tiempo || 0);
  }

  private static getCurrentTimerStart(cuenta: any): string | null {
    if (cuenta && Object.prototype.hasOwnProperty.call(cuenta, 'tiempo_inicio_actual')) {
      return cuenta?.tiempo_inicio_actual || null;
    }

    return cuenta?.fecha_crea || null;
  }

  private static getRemainingMinutes(cuenta: any, nowObj: Date) {
    const duration = this.getCurrentTimerDuration(cuenta);
    const start = this.getCurrentTimerStart(cuenta);
    if (!duration || !start) return { remainingMinutes: 0, elapsedMinutes: 0, isActive: false };

    const startObj = parseBusinessDate(start);
    const elapsedSeconds = Math.max(0, Math.floor((nowObj.getTime() - startObj.getTime()) / 1000));
    const remainingSeconds = Math.max(0, duration * 60 - elapsedSeconds);

    return {
      remainingMinutes: Math.ceil(remainingSeconds / 60),
      elapsedMinutes: Math.min(duration, Math.ceil(elapsedSeconds / 60)),
      isActive: remainingSeconds > 0
    };
  }

  private static ensureOpenHistorySegment(
    history: CuentaRoomHistoryItem[],
    cuenta: any,
    roomName: string
  ): CuentaRoomHistoryItem[] {
    if (!cuenta?.habitacion_id) return history;
    const hasOpen = history.some(item => item.endedAt === null);
    if (hasOpen) return history;

    const duration = this.getCurrentTimerDuration(cuenta);
    if (duration <= 0) return history;

    return [
      ...history,
      {
        roomId: String(cuenta.habitacion_id),
        roomName,
        startedAt: this.getCurrentTimerStart(cuenta) || getNowInBusinessTimezone(),
        endedAt: null,
        assignedMinutes: duration,
        consumedMinutes: 0
      }
    ];
  }

  private static closeOpenHistorySegment(
    history: CuentaRoomHistoryItem[],
    nowStr: string,
    elapsedMinutes: number,
    markAsCompleted = false,
    closedReason: CuentaRoomHistoryItem['closedReason'] = 'manual'
  ): CuentaRoomHistoryItem[] {
    const next = [...history];
    const openIndex = [...next].reverse().findIndex(item => item.endedAt === null);
    if (openIndex === -1) return next;

    const index = next.length - 1 - openIndex;
    const current = next[index];
    const assignedMinutes = Number(current.assignedMinutes || 0);
    const consumedMinutes = markAsCompleted
      ? assignedMinutes
      : Math.min(assignedMinutes, Math.max(0, elapsedMinutes));

    next[index] = {
      ...current,
      endedAt: nowStr,
      consumedMinutes,
      remainingMinutes: Math.max(0, assignedMinutes - consumedMinutes),
      closedReason
    };
    return next;
  }

  private static appendHistorySegment(
    history: CuentaRoomHistoryItem[],
    roomId: string,
    roomName: string,
    nowStr: string,
    assignedMinutes: number,
    carriedFromPrevious = false
  ): CuentaRoomHistoryItem[] {
    return [
      ...history,
      {
        roomId: String(roomId),
        roomName,
        startedAt: nowStr,
        endedAt: null,
        assignedMinutes: Number(assignedMinutes || 0),
        consumedMinutes: 0,
        remainingMinutes: Number(assignedMinutes || 0),
        carriedFromPrevious
      }
    ];
  }

  private static normalizeCuentaRow(cuenta: any) {
    if (!cuenta) return cuenta;
    const history = this.hydrateRoomHistory(this.parseRoomHistory(cuenta.habitaciones_historial));
    return {
      ...cuenta,
      tiempo_total: Number(cuenta.tiempo_total ?? cuenta.tiempo ?? 0),
      tiempo_activo: Number(cuenta.tiempo_activo ?? cuenta.tiempo_actual ?? cuenta.tiempo ?? 0),
      habitaciones_historial_data: history
    };
  }

  private static hydrateRoomHistory(
    history: CuentaRoomHistoryItem[],
    nowStr = getNowInBusinessTimezone()
  ): CuentaRoomHistoryViewItem[] {
    const nowObj = parseBusinessDate(nowStr);

    return history.map(item => {
      const assignedMinutes = Number(item.assignedMinutes || 0);
      let consumedMinutes = Math.max(0, Number(item.consumedMinutes || 0));
      let remainingMinutes = Math.max(
        0,
        Number(item.remainingMinutes ?? assignedMinutes - consumedMinutes)
      );

      if (item.startedAt) {
        const startedAt = parseBusinessDate(item.startedAt);

        if (!item.endedAt) {
          const elapsedMinutes = Math.max(
            0,
            Math.ceil((nowObj.getTime() - startedAt.getTime()) / 60000)
          );
          consumedMinutes = Math.min(assignedMinutes, elapsedMinutes);
          remainingMinutes = Math.max(0, assignedMinutes - consumedMinutes);
        } else {
          const endedAt = parseBusinessDate(item.endedAt);
          const elapsedMinutes = Math.max(
            0,
            Math.ceil((endedAt.getTime() - startedAt.getTime()) / 60000)
          );

          // Si el historial viejo quedo mal guardado con consumido=0, lo reconstruimos
          // desde inicio/fin para que el detalle muestre lo que realmente paso.
          if (
            !Number.isFinite(consumedMinutes) ||
            consumedMinutes <= 0 ||
            remainingMinutes >= assignedMinutes
          ) {
            consumedMinutes = Math.min(assignedMinutes, elapsedMinutes);
            remainingMinutes = Math.max(0, assignedMinutes - consumedMinutes);
          }
        }
      }

      consumedMinutes = Math.min(assignedMinutes, Math.max(0, consumedMinutes));
      remainingMinutes = Math.max(0, Math.min(assignedMinutes, remainingMinutes));

      return {
        ...item,
        assignedMinutes,
        consumedMinutes,
        remainingMinutes,
        isActive: !item.endedAt && remainingMinutes > 0
      };
    });
  }

  private static buildFinancialSummary(cuenta: any, solicitudes: CuentaAnulacionRow[]) {
    const totalActual = Number(cuenta?.total || 0);
    const totalAnuladoAprobado = solicitudes
      .filter(item => item.estado === 'aprobado')
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);
    const totalAnulacionPendiente = solicitudes
      .filter(item => item.estado === 'pendiente')
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);
    const totalAnulacionRechazada = solicitudes
      .filter(item => item.estado === 'rechazado')
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);

    const totalOriginal = totalActual + totalAnuladoAprobado;

    return {
      total_original: totalOriginal,
      total_actual: totalActual,
      total_anulado_aprobado: totalAnuladoAprobado,
      total_anulacion_pendiente: totalAnulacionPendiente,
      total_anulacion_rechazada: totalAnulacionRechazada,
      tuvo_anulacion_parcial: totalAnuladoAprobado > 0 && totalActual > 0,
      fue_anulada_total: totalAnuladoAprobado > 0 && totalActual <= 0
    };
  }

  static async finalizeRoomSession(id: string, nowStr = getNowInBusinessTimezone()) {
    const cuenta = await query<any[]>(
      `SELECT c.*, h.nombre as habitacion_numero
       FROM cuentas c
       LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
       WHERE c.id_cuenta = ?`,
      [id]
    );

    if (!cuenta.length) return null;

    const row = cuenta[0];
    const nowObj = parseBusinessDate(nowStr);
    const timing = this.getRemainingMinutes(row, nowObj);
    let history = this.parseRoomHistory(row.habitaciones_historial);
    history = this.ensureOpenHistorySegment(
      history,
      row,
      row.habitacion_numero || 'Sin habitacion'
    );
    history = this.closeOpenHistorySegment(
      history,
      nowStr,
      timing.elapsedMinutes,
      !timing.isActive,
      timing.isActive ? 'manual' : 'expired'
    );

    await query(
      'UPDATE cuentas SET tiempo_actual = 0, tiempo_inicio_actual = NULL, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
      [this.stringifyRoomHistory(history), nowStr, id]
    );

    return history;
  }

  static async getAll(tipo?: string, estado?: string) {
    if (tipo === 'resumen') {
      const result = await query<any[]>(
        `SELECT SUM(total) as total_por_cobrar FROM ${this.TABLE} WHERE estado = 1`
      );
      return { total_por_cobrar: result[0]?.total_por_cobrar || 0 };
    }

    let where = 'WHERE c.estado >= 0';
    let params: any[] = [];
    if (estado !== undefined) {
      where = 'WHERE c.estado = ?';
      params.push(estado);
    }

    return await query(
      `
      SELECT c.*,
             COALESCE(c.tiempo_actual, CASE WHEN c.estado = 1 THEN c.tiempo ELSE 0 END) as tiempo_activo,
             c.tiempo as tiempo_total,
             CONCAT(cl.nombre, ' ', cl.apellido) as cliente_nombre, cl.saldo as cliente_saldo,
             h.nombre as habitacion_numero, u.nick as nombre_cajero,
             (SELECT COUNT(*) FROM detalle_cuentas dc WHERE dc.cuenta_id = c.id_cuenta) as total_detalles,
             (SELECT COUNT(*) FROM cuentas_usuarios cu WHERE cu.cuenta_id = c.id_cuenta) as total_usuarios
      FROM ${this.TABLE} c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id_cliente
      LEFT JOIN habitaciones h ON c.habitacion_id = h.id_habitacion
      LEFT JOIN usuarios u ON c.created_by = u.id_usuario
      ${where} ORDER BY c.fecha_crea DESC
    `,
      params
    );
  }

  static async getById(id: string) {
    return await withTransaction(async trx => {
      const cuentaRes = await trx<any[]>(
        `
        SELECT c.*,
               COALESCE(c.tiempo_actual, CASE WHEN c.estado = 1 THEN c.tiempo ELSE 0 END) as tiempo_activo,
               c.tiempo as tiempo_total,
               CONCAT(cl.nombre, ' ', cl.apellido) as cliente_nombre, h.nombre as habitacion_numero,
               u.nick as nombre_cajero, u.foto as foto_cajero, uc.nick as nombre_cobrador, uc.foto as foto_cobrador
        FROM ${this.TABLE} c
        LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
        LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
        LEFT JOIN usuarios u ON u.id_usuario = c.created_by
        LEFT JOIN usuarios uc ON uc.id_usuario = c.cobrado_por
        WHERE c.${this.ID_COL} = ?
      `,
        [id]
      );

      if (cuentaRes.length === 0) return null;

      const detalles = await trx(
        `
        SELECT DC.*, H.nick as hostess_nick, H.foto as hostess_foto, U.nick as added_by, U.foto as added_by_foto,
               PR.nombre AS producto, C.nombre AS categoria
        FROM detalle_cuentas DC 
        LEFT JOIN productos PR ON PR.id_producto = DC.producto_id
        LEFT JOIN categorias C ON C.id_categoria = PR.categoria_id
        LEFT JOIN usuarios H ON H.id_usuario = DC.hostess_id
        LEFT JOIN usuarios U ON U.id_usuario = DC.created_by
        WHERE DC.cuenta_id = ?
      `,
        [id]
      );

      const usuarios = await trx(
        `
        SELECT cu.*, u.nick as usuario_nombre, u.foto as usuario_foto
        FROM cuentas_usuarios cu
        LEFT JOIN usuarios u ON u.id_usuario = cu.usuario_id
        WHERE cu.cuenta_id = ?
      `,
        [id]
      );

      const solicitudesAnulacion = await trx<CuentaAnulacionRow[]>(
        `
        SELECT sac.id,
               sac.monto,
               sac.motivo,
               sac.estado,
               sac.fecha_crea,
               sac.fecha_mod,
               req.nick as requested_by_nombre,
               app.nick as approved_by_nombre
        FROM solicitudes_anulacion_cuentas sac
        LEFT JOIN usuarios req ON BINARY req.id_usuario = BINARY sac.requested_by
        LEFT JOIN usuarios app ON BINARY app.id_usuario = BINARY sac.approved_by
        WHERE BINARY sac.cuenta_id = BINARY ?
        ORDER BY sac.fecha_crea DESC
      `,
        [id]
      );

      const cuentaNormalizada = this.normalizeCuentaRow({ ...cuentaRes[0], detalles, usuarios });

      return {
        ...cuentaNormalizada,
        solicitudes_anulacion: solicitudesAnulacion,
        resumen_financiero: this.buildFinancialSummary(cuentaNormalizada, solicitudesAnulacion)
      };
    });
  }

  static async create(body: CuentaCreateBody, createdBy: string) {
    return await withTransaction(async trx => {
      const id = generateUUID();
      const now = getNowInBusinessTimezone();
      await BaseRepository.insert(trx, this.TABLE, {
        [this.ID_COL]: id,
        codigo: body.codigo,
        cliente_id: body.cliente_id || null,
        total_comision: body.total_comision,
        habitacion_id: body.habitacion_id || null,
        sub_total: body.sub_total,
        total: body.total,
        propina: body.propina || 0,
        fecha_crea: now,
        estado: 1,
        tiempo: body.tiempo || 0,
        tiempo_actual: body.tiempo || 0,
        tiempo_inicio_actual: body.habitacion_id && (body.tiempo ?? 0) > 0 ? now : null,
        habitaciones_historial:
          body.habitacion_id && (body.tiempo ?? 0) > 0
            ? JSON.stringify([
                {
                  roomId: String(body.habitacion_id),
                  roomName: body.habitacion_nombre || 'Sin habitacion',
                  startedAt: now,
                  endedAt: null,
                  assignedMinutes: Number(body.tiempo || 0),
                  consumedMinutes: 0
                }
              ])
            : null,
        created_by: createdBy
      });

      for (const d of body.detalles) {
        const hasAnfitrionas = (body.usuarios ?? []).length > 0;
        const selectedHostesses = d.hostesses && d.hostesses.length > 0 ? d.hostesses : [null];
        const isSpecial = d.isChampagne || d.precio >= 160000;
        const comision = hasAnfitrionas ? d.comision || 0 : 0;

        if (isSpecial) {
          const totalComm = Math.round(comision);
          const commBase = Math.floor(totalComm / selectedHostesses.length);
          const remainder = totalComm % selectedHostesses.length;
          for (let i = 0; i < selectedHostesses.length; i++) {
            await trx(
              `INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateUUID(),
                id,
                d.producto_id,
                d.precio,
                i === 0 ? d.cantidad : 0,
                i === 0 ? d.sub_total : 0,
                commBase + (i === 0 ? remainder : 0),
                selectedHostesses[i],
                now,
                createdBy
              ]
            );
          }
        } else {
          const baseQty = Math.floor(d.cantidad / selectedHostesses.length);
          let remainingQty = d.cantidad;
          for (let i = 0; i < selectedHostesses.length; i++) {
            const qty =
              i === selectedHostesses.length - 1 ? remainingQty : baseQty === 0 ? 1 : baseQty;
            remainingQty -= qty;
            if (qty > 0 || selectedHostesses.length === 1) {
              await trx(
                `INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  generateUUID(),
                  id,
                  d.producto_id,
                  d.precio,
                  qty,
                  d.precio * qty,
                  comision,
                  selectedHostesses[i],
                  now,
                  createdBy
                ]
              );
            }
          }
        }
      }

      if ((body.usuarios ?? []).length) {
        for (const uId of body.usuarios ?? []) {
          await trx(
            `INSERT INTO cuentas_usuarios (id_cuenta_usuario, cuenta_id, usuario_id) VALUES (?, ?, ?)`,
            [generateUUID(), id, uId]
          );
        }
      }

      if (body.habitacion_id && (body.tiempo ?? 0) > 0) {
        await trx(
          'UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ? AND (precio > 0 OR tiempo > 0 OR comision_anfitriona > 0)',
          [body.habitacion_id]
        );
        const habitacion = await trx<any[]>(
          'SELECT nombre FROM habitaciones WHERE id_habitacion = ?',
          [body.habitacion_id]
        );
        await trx('UPDATE cuentas SET habitaciones_historial = ? WHERE id_cuenta = ?', [
          JSON.stringify([
            {
              roomId: String(body.habitacion_id),
              roomName: habitacion[0]?.nombre || body.habitacion_id,
              startedAt: now,
              endedAt: null,
              assignedMinutes: Number(body.tiempo || 0),
              consumedMinutes: 0
            }
          ]),
          id
        ]);
        const cliente = await trx<any[]>('SELECT nombre FROM clientes WHERE id_cliente = ?', [
          body.cliente_id
        ]);
        sendNotificationToAll('timer_started', {
          servicioId: id,
          roomId: body.habitacion_id,
          roomName: habitacion[0]?.nombre || body.habitacion_id,
          duration: body.tiempo ?? 0,
          startTime: now,
          codigo: body.codigo,
          clienteNombre: cliente[0]?.nombre || 'Cliente',
          tipoTransaccion: 'cuenta',
          status: 1
        });
        sendNotificationToAll('timers_updated', { timestamp: now });
      }
      return await this.getById(id);
    });
  }

  static async updateCuenta(id: string, body: CuentaUpdateBody, createdBy: string) {
    const bizNow = getNowInBusinessTimezone();
    const nowObj = parseBusinessDate(bizNow);

    await withTransaction(async trx => {
      if (body.estado !== undefined)
        await trx('UPDATE cuentas SET estado = ? WHERE id_cuenta = ?', [body.estado, id]);
      if (body.detalles?.length) {
        let nuevoSubTotal = body.detalles.reduce((acc: number, d: any) => acc + d.sub_total, 0);
        let nuevaComision = body.detalles.reduce((acc: number, d: any) => acc + d.comision, 0);
        const actual = await trx<any[]>(
          'SELECT sub_total, total_comision FROM cuentas WHERE id_cuenta = ?',
          [id]
        );
        const finalSub = (actual[0]?.sub_total || 0) + nuevoSubTotal;
        const finalComm = (actual[0]?.total_comision || 0) + nuevaComision;
        await trx(
          'UPDATE cuentas SET sub_total = ?, total_comision = ?, total = ?, fecha_mod = ? WHERE id_cuenta = ?',
          [finalSub, finalComm, finalSub, bizNow, id]
        );

        for (const d of body.detalles) {
          const hasAnfitrionas = (body.usuarios ?? []).length > 0;
          const selectedHostesses = d.hostesses?.length ? d.hostesses : [null];
          const isSpecial = d.isChampagne || d.precio >= 160000;
          const comision = hasAnfitrionas ? d.comision || 0 : 0;
          if (isSpecial) {
            const tComm = Math.round(comision);
            const base = Math.floor(tComm / selectedHostesses.length);
            const rem = tComm % selectedHostesses.length;
            for (let i = 0; i < selectedHostesses.length; i++) {
              await trx(
                'INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  generateUUID(),
                  id,
                  d.producto_id,
                  d.precio,
                  i === 0 ? d.cantidad : 0,
                  i === 0 ? d.sub_total : 0,
                  base + (i === 0 ? rem : 0),
                  selectedHostesses[i],
                  bizNow,
                  createdBy
                ]
              );
            }
          } else {
            const baseQty = Math.floor(d.cantidad / selectedHostesses.length);
            let remQty = d.cantidad;
            for (let i = 0; i < selectedHostesses.length; i++) {
              const qty = i === selectedHostesses.length - 1 ? remQty : baseQty === 0 ? 1 : baseQty;
              remQty -= qty;
              if (qty > 0 || selectedHostesses.length === 1) {
                await trx(
                  'INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [
                    generateUUID(),
                    id,
                    d.producto_id,
                    d.precio,
                    qty,
                    d.precio * qty,
                    comision,
                    selectedHostesses[i],
                    bizNow,
                    createdBy
                  ]
                );
              }
            }
          }
        }
      }
      if ((body.usuarios ?? []).length) {
        await trx('DELETE FROM cuentas_usuarios WHERE cuenta_id = ?', [id]);
        for (const uId of body.usuarios ?? []) {
          await trx(
            'INSERT INTO cuentas_usuarios (id_cuenta_usuario, cuenta_id, usuario_id) VALUES (?, ?, ?)',
            [generateUUID(), id, uId]
          );
        }
      }
    });

    if ((body.extraTiempo ?? 0) > 0) {
      const c = await query<any[]>('SELECT * FROM cuentas WHERE id_cuenta = ?', [id]);
      if (c.length) {
        const room = await query<any[]>('SELECT nombre FROM habitaciones WHERE id_habitacion = ?', [
          c[0].habitacion_id
        ]);
        const timing = this.getRemainingMinutes(c[0], nowObj);
        let history = this.parseRoomHistory(c[0].habitaciones_historial);
        history = this.ensureOpenHistorySegment(history, c[0], room[0]?.nombre || 'Sin habitacion');

        const addedMinutes = Number(body.extraTiempo ?? 0);
        const totalAssigned = Number(c[0].tiempo || 0) + addedMinutes;
        const currentRoomId = String(c[0].habitacion_id || '');
        const openIndex = [...history]
          .reverse()
          .findIndex(item => item.endedAt === null && String(item.roomId) === currentRoomId);
        const hasOpenSameRoom = openIndex !== -1;

        if (timing.isActive && hasOpenSameRoom) {
          const realIndex = history.length - 1 - openIndex;
          history[realIndex] = {
            ...history[realIndex],
            assignedMinutes: Number(history[realIndex].assignedMinutes || 0) + addedMinutes
          };
        } else {
          history = this.closeOpenHistorySegment(
            history,
            bizNow,
            timing.elapsedMinutes,
            !timing.isActive,
            timing.isActive ? 'changed_room' : 'expired'
          );
          history = this.appendHistorySegment(
            history,
            currentRoomId,
            room[0]?.nombre || 'Sin habitacion',
            bizNow,
            addedMinutes
          );
        }

        const nuevoTiempo = (timing.isActive ? timing.remainingMinutes : 0) + addedMinutes;
        await query(
          'UPDATE cuentas SET tiempo = ?, tiempo_actual = ?, tiempo_inicio_actual = ?, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
          [totalAssigned, nuevoTiempo, bizNow, this.stringifyRoomHistory(history), bizNow, id]
        );
        if (c[0].habitacion_id)
          await query(
            'UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ? AND (precio > 0 OR tiempo > 0)',
            [c[0].habitacion_id]
          );

        const client = await query<any[]>(
          'SELECT cl.nombre FROM cuentas c LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id WHERE c.id_cuenta = ?',
          [id]
        );
        sendNotificationToAll(timing.isActive ? 'timer_updated' : 'timer_started', {
          servicioId: id,
          roomId: c[0].habitacion_id,
          roomName: room[0]?.nombre || '',
          duration: nuevoTiempo,
          startTime: bizNow,
          codigo: c[0].codigo,
          clienteNombre: client[0]?.nombre || 'Cliente',
          tipoTransaccion: 'cuenta',
          status: 1
        });
      }
    }

    // Si se envian habitacion_id y tiempo (productos con comision >= 30k)
    // Permite tiempo = 0 para cambio de habitación sin timer
    if (body.habitacion_id && (body.tiempo ?? 0) >= 0) {
      const room = await query<any[]>(
        'SELECT nombre, precio, tiempo as room_tiempo, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
        [body.habitacion_id]
      );
      const c = await query<any[]>(
        'SELECT codigo, cliente_id, habitacion_id, tiempo, tiempo_actual, tiempo_inicio_actual, fecha_crea, habitaciones_historial FROM cuentas WHERE id_cuenta = ?',
        [id]
      );
      const client = await query<any[]>('SELECT nombre FROM clientes WHERE id_cliente = ?', [
        c[0]?.cliente_id
      ]);

      const previousRoomId = c[0]?.habitacion_id || null;
      const sameRoom = previousRoomId && String(previousRoomId) === String(body.habitacion_id);
      const timing = this.getRemainingMinutes(c[0], nowObj);
      const nuevoTiempo =
        (timing.isActive ? timing.remainingMinutes : 0) + Number(body.tiempo || 0);
      const totalAssigned = Number(c[0]?.tiempo || 0) + Number(body.tiempo || 0);
      let history = this.parseRoomHistory(c[0]?.habitaciones_historial);
      if (previousRoomId) {
        const previousRoom = await query<any[]>(
          'SELECT nombre FROM habitaciones WHERE id_habitacion = ?',
          [previousRoomId]
        );
        history = this.ensureOpenHistorySegment(
          history,
          c[0],
          previousRoom[0]?.nombre || 'Sin habitacion'
        );
        history = this.closeOpenHistorySegment(
          history,
          bizNow,
          timing.elapsedMinutes,
          !timing.isActive,
          sameRoom
            ? timing.isActive
              ? 'manual'
              : 'expired'
            : timing.isActive
              ? 'changed_room'
              : 'expired'
        );
      }
      history = this.appendHistorySegment(
        history,
        String(body.habitacion_id),
        room[0]?.nombre || '',
        bizNow,
        nuevoTiempo,
        timing.isActive && Boolean(previousRoomId)
      );

      await query(
        'UPDATE cuentas SET habitacion_id = ?, tiempo = ?, tiempo_actual = ?, tiempo_inicio_actual = ?, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
        [
          body.habitacion_id,
          totalAssigned,
          nuevoTiempo,
          bizNow,
          this.stringifyRoomHistory(history),
          bizNow,
          id
        ]
      );

      const r = room[0];
      const tieneConfig =
        Number(r?.precio || 0) > 0 ||
        Number(r?.room_tiempo || 0) > 0 ||
        Number(r?.comision_anfitriona || 0) > 0;
      if (tieneConfig) {
        await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [
          body.habitacion_id
        ]);
      }

      if (previousRoomId && !sameRoom) {
        await RoomManager.resumeRoomLogic(query as any, String(previousRoomId));
        sendNotificationToAll('room_available', { roomId: previousRoomId });
      }

      // Solo enviar notificación de timer si tiempo > 0
      if ((body.tiempo ?? 0) > 0) {
        sendNotificationToAll('timer_started', {
          servicioId: id,
          roomId: body.habitacion_id,
          roomName: r?.nombre || '',
          duration: nuevoTiempo,
          startTime: bizNow,
          codigo: c[0]?.codigo || '',
          clienteNombre: client[0]?.nombre || 'Cliente',
          tipoTransaccion: 'cuenta',
          status: 1
        });
        sendNotificationToAll('timers_updated', { timestamp: bizNow });
      }
    }

    return await this.getById(id);
  }

  static async cobrar(id: string, body: CuentaCobrarBody, cobradoPor: string) {
    return await withTransaction(async trx => {
      const cuenta = await trx<any[]>('SELECT * FROM cuentas WHERE id_cuenta = ?', [id]);
      if (!cuenta.length) throw new NotFoundError('Cuenta', id);
      if (![1, 4].includes(Number(cuenta[0].estado))) {
        throw new BusinessError('La cuenta ya fue procesada', 'CUENTA_YA_PROCESADA');
      }

      const now = getNowInBusinessTimezone();
      const montoFinal = Number(body.montoFinal ?? body.total_cobrado ?? cuenta[0].total ?? 0);
      const propinaFinal = Number(body.propinaFinal ?? body.propina ?? 0);
      const tipoPago = body.tipoPago ?? body.metodoPago ?? body.metodo_pago ?? 'efectivo';
      const metodoPago = body.metodoPago ?? body.metodo_pago ?? tipoPago;
      const timing = this.getRemainingMinutes(cuenta[0], parseBusinessDate(now));
      let history = this.parseRoomHistory(cuenta[0].habitaciones_historial);
      if (cuenta[0].habitacion_id) {
        const room = await trx<any[]>('SELECT nombre FROM habitaciones WHERE id_habitacion = ?', [
          cuenta[0].habitacion_id
        ]);
        history = this.ensureOpenHistorySegment(
          history,
          cuenta[0],
          room[0]?.nombre || 'Sin habitacion'
        );
        history = this.closeOpenHistorySegment(
          history,
          now,
          timing.elapsedMinutes,
          !timing.isActive,
          'charged'
        );
      }

      await trx(
        'UPDATE cuentas SET estado = 0, metodo_pago = ?, cobrado_por = ?, tiempo_actual = 0, tiempo_inicio_actual = NULL, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
        [metodoPago, cobradoPor, this.stringifyRoomHistory(history), now, id]
      );

      if (tipoPago === 'prepago') {
        const client = await trx<any[]>(
          'SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE',
          [cuenta[0].cliente_id]
        );
        if (!client.length || client[0].saldo < montoFinal)
          throw new BusinessError('Saldo insuficiente', 'SALDO_INSUFICIENTE');
        await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [
          montoFinal,
          cuenta[0].cliente_id
        ]);
      }

      const idCaja = await CashRegisterRepository.getCurrentCajaId(trx);
      if (idCaja) {
        await CashRegisterRepository.updateBalances(trx, idCaja, {
          // `cajas` no tiene columna `cuenta`; las cuentas se contabilizan como venta
          venta: montoFinal - propinaFinal,
          propina: propinaFinal,
          efectivo: tipoPago === 'efectivo' ? montoFinal : 0,
          tarjeta: tipoPago === 'tarjeta' ? montoFinal : 0,
          transferencia: tipoPago === 'transferencia' ? montoFinal : 0,
          prepago: tipoPago === 'prepago' ? montoFinal : 0
        });
      }

      // Nota: el registro de comisiones y propinas se delega a SaleService.createSale()
      // que se invoca en la segunda llamada del hook useCuentaCobro (POST /api/sales).
      // Aquí solo se actualiza la caja y se libera la habitación.

      if (cuenta[0].habitacion_id) {
        await trx('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [
          cuenta[0].habitacion_id
        ]);
        sendNotificationToAll('room_available', { roomId: cuenta[0].habitacion_id });
      }

      sendNotificationToAll('timer_stopped', {
        servicioId: id,
        status: 0,
        tipoTransaccion: 'cuenta'
      });
      sendNotificationToAll('timers_updated', { timestamp: now });
    });

    return await this.getById(id);
  }

  static async stopTimer(id: string, userId: string) {
    const now = getNowInBusinessTimezone();

    await withTransaction(async trx => {
      const cuenta = await trx<any[]>('SELECT * FROM cuentas WHERE id_cuenta = ?', [id]);
      if (!cuenta.length) throw new NotFoundError('Cuenta', id);

      if (cuenta[0].habitacion_id) {
        await this.finalizeRoomSession(id, now);
        await RoomManager.resumeRoomLogic(
          trx as unknown as TransactionQuery,
          String(cuenta[0].habitacion_id)
        );
        sendNotificationToAll('room_available', { roomId: cuenta[0].habitacion_id });
      } else {
        await trx(
          'UPDATE cuentas SET tiempo_actual = 0, tiempo_inicio_actual = NULL, fecha_mod = ? WHERE id_cuenta = ?',
          [now, id]
        );
      }
    });

    sendNotificationToAll('timer_stopped', {
      servicioId: id,
      status: 1,
      tipoTransaccion: 'cuenta'
    });
    sendNotificationToAll('timers_updated', { timestamp: now });

    return await this.getById(id);
  }

  static async requestAnulacion(
    id: string,
    reason: string,
    requestedBy: string,
    requestedAmount: number
  ): Promise<string> {
    const now = getNowInBusinessTimezone();
    const idAnul = generateUUID();
    const monto = Number(requestedAmount || 0);
    let finalizedTimer = false;
    let roomIdToRelease: string | null = null;

    await withTransaction(async trx => {
      const cuenta = await trx<any[]>(
        `SELECT c.id_cuenta, c.estado, c.tiempo_actual, c.tiempo_inicio_actual, c.total, c.habitacion_id,
                c.habitaciones_historial, c.fecha_crea, h.nombre as habitacion_numero
         FROM cuentas c
         LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
         WHERE c.id_cuenta = ?`,
        [id]
      );
      if (!cuenta.length) throw new NotFoundError('Cuenta', id);
      if (Number(cuenta[0].estado) !== 1)
        throw new BusinessError(
          'La cuenta no se puede solicitar para anulacion',
          'CUENTA_NO_ANULABLE'
        );
      if (monto <= 0) {
        throw new BusinessError('El monto solicitado debe ser mayor a 0', 'MONTO_INVALIDO');
      }
      if (monto > Number(cuenta[0].total || 0)) {
        throw new BusinessError(
          'El monto solicitado no puede ser mayor al total de la cuenta',
          'MONTO_EXCEDE_TOTAL'
        );
      }

      if (Number(cuenta[0].tiempo_actual || 0) > 0) {
        const timing = this.getRemainingMinutes(cuenta[0], parseBusinessDate(now));
        let history = this.parseRoomHistory(cuenta[0].habitaciones_historial);
        history = this.ensureOpenHistorySegment(
          history,
          cuenta[0],
          cuenta[0].habitacion_numero || 'Sin habitacion'
        );
        history = this.closeOpenHistorySegment(
          history,
          now,
          timing.elapsedMinutes,
          !timing.isActive,
          'cancelled'
        );

        await trx(
          'UPDATE cuentas SET tiempo_actual = 0, tiempo_inicio_actual = NULL, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
          [this.stringifyRoomHistory(history), now, id]
        );

        if (cuenta[0].habitacion_id) {
          await RoomManager.resumeRoomLogic(
            trx as unknown as TransactionQuery,
            String(cuenta[0].habitacion_id)
          );
          roomIdToRelease = String(cuenta[0].habitacion_id);
        }

        finalizedTimer = true;
      }

      await trx(
        `INSERT INTO solicitudes_anulacion_cuentas (id, cuenta_id, monto, motivo, requested_by, estado, fecha_crea)
         VALUES (?, ?, ?, ?, ?, 'pendiente', ?)`,
        [idAnul, id, monto, reason, requestedBy, now]
      );

      await trx('UPDATE cuentas SET estado = 2, fecha_mod = ? WHERE id_cuenta = ?', [now, id]);
    });

    if (finalizedTimer) {
      if (roomIdToRelease) {
        sendNotificationToAll('room_available', { roomId: roomIdToRelease });
      }
      sendNotificationToAll('timer_stopped', {
        servicioId: id,
        status: 1,
        tipoTransaccion: 'cuenta'
      });
      sendNotificationToAll('timers_updated', { timestamp: now });
    }

    return idAnul;
  }

  static async delete(id: string) {
    await withTransaction(async trx => {
      await BaseRepository.delete(trx, 'detalle_cuentas', 'cuenta_id', id);
      await BaseRepository.delete(trx, 'cuentas_usuarios', 'cuenta_id', id);
      await BaseRepository.delete(trx, this.TABLE, this.ID_COL, id);
    });
  }
}
