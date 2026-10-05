import { obtenerCajaActiva, registrarMovimientoCobro } from '@/modules/caja';
import { conContextoOperacionExistente } from '@/lib/transaccion/compatibilidad';
import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { CajaSchema, type CajaType } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';
import { logger } from '@/lib/utils/logger';
import { ConflictError, NotFoundError, BusinessError, DatabaseError } from '@/lib/errors/errors';
import { efectivoBaseCaja, montoCierreCaja, devolucionesDe } from '@/lib/business/cajaEfectivo';

/** Solicitud de cierre de caja esperando (o con) la autorización del admin. */
export interface SolicitudCierreCaja {
  id: string;
  caja_id: string;
  token: string;
  /**
   * `pendiente` espera respuesta, `aprobada` cerró la caja, `rechazada` la dejó abierta por
   * decisión del administrador y `expirada` es el silencio: nadie contestó dentro de la
   * ventana de recordatorios y el cajero volvió a pedir el cierre.
   */
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'expirada';
  monto_cierre_calculado: number;
  saldo_clientes_descontado: number;
  solicitado_por: string;
  motivo: string | null;
  fecha_solicitud: string;
  /** Cuándo salió el último aviso al administrador (el primero, o un reenvío). */
  ultimo_aviso_en?: string | null;
}

/**
 * Tiempo mínimo entre avisos del mismo cierre pendiente.
 *
 * El reenvío existe para que un cierre no quede esperando en silencio, no para
 * insistir: sin este freno un cajero con el dedo rápido convierte el WhatsApp del
 * administrador en spam y Twilio termina limitando el número.
 */
export const AVISO_CIERRE_ENFRIAMIENTO_MS = 60_000;

/**
 * Cada cuánto el cron vuelve a avisar al administrador de un cierre sin respuesta.
 *
 * Es el reintento automático, no el botón: el cajero puede reenviar a mano cada minuto
 * (`AVISO_CIERRE_ENFRIAMIENTO_MS`), pero si se va y nadie contesta, el aviso ya salió solo.
 */
export const AVISO_CIERRE_REINTENTO_MS = 10 * 60_000;

/**
 * Cuánto se insiste antes de dar el cierre por "sin respuesta".
 *
 * Durante esta ventana el cron sigue recordando; pasada, deja de insistir y el cajero puede
 * **pedir el cierre de nuevo** (la solicitud vieja se expira y se crea una nueva). Un cierre
 * que nadie contesta no puede quedarse bloqueado para siempre por el índice único parcial.
 */
export const AVISO_CIERRE_VENTANA_MS = 30 * 60_000;

export class CashRegisterRepository {
  /**
   * Expresión SQL que dice si el cierre pendiente de la caja quedó sin respuesta.
   *
   * Se calcula en SQL —y no en JS— porque compara `fecha_solicitud` con la hora de negocio
   * que se le pasa como parámetro: restarlos en el proceso mezclaría husos. Queda `false`
   * cuando no hay cierre pendiente, así la UI puede preguntar sin mirar dos campos.
   */
  private static readonly SQL_CIERRE_ESTANCADO = `COALESCE((
    SELECT (s.fecha_solicitud <= (CAST(? AS timestamp) - (interval '1 second' * ${AVISO_CIERRE_VENTANA_MS / 1000})))
    FROM solicitudes_cierre_caja s
    WHERE s.caja_id = c.id_caja AND s.estado = 'pendiente'
    ORDER BY s.fecha_solicitud DESC LIMIT 1
  ), false)`;

  private static async getPrepagoMetrics(
    fechaApertura?: string | Date | null,
    fechaCierre?: string | Date | null
  ): Promise<{
    prepago_cargado: number;
    prepago_consumido: number;
    prepago_pendiente_clientes: number;
  }> {
    try {
      if (!fechaApertura) {
        const [saldoRow] = await query<any[]>(
          'SELECT COALESCE(SUM(saldo), 0) as saldo_pendiente FROM clientes WHERE saldo > 0'
        );

        return {
          prepago_cargado: 0,
          prepago_consumido: 0,
          prepago_pendiente_clientes: Number(saldoRow?.saldo_pendiente || 0)
        };
      }

      const fechaInicio =
        fechaApertura instanceof Date ? fechaApertura.toISOString() : fechaApertura;
      const fechaFin =
        fechaCierre instanceof Date
          ? fechaCierre.toISOString()
          : fechaCierre || getNowInBusinessTimezone();

      const [movimientosRow] = await query<any[]>(
        `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'CARGA' THEN monto ELSE 0 END), 0) as prepago_cargado,
         COALESCE(SUM(CASE WHEN tipo = 'CONSUMO' THEN monto ELSE 0 END), 0) as prepago_consumido
       FROM clientes_prepago_movimientos
       WHERE fecha_crea >= ? AND fecha_crea <= ?`,
        [fechaInicio, fechaFin]
      );

      const [saldoRow] = await query<any[]>(
        'SELECT COALESCE(SUM(saldo), 0) as saldo_pendiente FROM clientes WHERE saldo > 0'
      );

      return {
        prepago_cargado: Number(movimientosRow?.prepago_cargado || 0),
        prepago_consumido: Number(movimientosRow?.prepago_consumido || 0),
        prepago_pendiente_clientes: Number(saldoRow?.saldo_pendiente || 0)
      };
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getPrepagoMetrics:', { err });
      throw new DatabaseError('Error al obtener métricas de prepago', err);
    }
  }

  private static mapCajaFromDB(row: any): CajaType {
    return CajaSchema.parse({
      id_caja: row.id_caja,
      fecha_apertura: row.fecha_apertura,
      usuario_id_apertura: row.usuario_id_apertura,
      monto_apertura: row.monto_apertura,
      estado: row.estado,
      fecha_cierre: row.fecha_cierre,
      usuario_id_cierre: row.usuario_id_cierre,
      monto_cierre: row.monto_cierre,
      ventas: row.venta ?? 0,
      servicios: row.servicio ?? 0,
      efectivo: row.efectivo ?? 0,
      tarjeta: row.tarjeta ?? 0,
      transferencia: row.transferencia ?? 0,
      devoluciones: row.devolucion ?? 0,
      prepago: row.prepago ?? 0,
      prepago_cargado: row.prepago_cargado ?? 0,
      prepago_consumido: row.prepago_consumido ?? 0,
      prepago_pendiente_clientes: row.prepago_pendiente_clientes ?? 0,
      propina: row.propina ?? 0,
      cuenta: row.cuenta ?? 0,
      anticipo: row.anticipo ?? 0,
      retiro_total: Number(row.retiro_total ?? 0),
      iva: row.iva ?? 0,
      comision: row.comision ?? 0,
      usuario_apertura: row.usuario_apertura,
      cajero_nombre: row.cajero_nombre,
      cajero_foto: row.cajero_foto,
      cajero_cierre_nombre: row.cajero_cierre_nombre,
      cajero_cierre_foto: row.cajero_cierre_foto,
      cierre_solicitado_en: row.cierre_solicitado_en ?? null,
      cierre_solicitado_por: row.cierre_solicitado_por ?? null,
      cierre_ultimo_aviso_en: row.cierre_ultimo_aviso_en ?? null,
      saldo_clientes_descontado: Number(row.saldo_clientes_descontado ?? 0),
      cierre_pendiente: row.cierre_pendiente === true,
      cierre_estancado: row.cierre_estancado === true
    });
  }

  static async getCurrentCajaId(trx?: TransactionQuery): Promise<string | null> {
    return trx ? conContextoOperacionExistente(trx, obtenerCajaActiva) : obtenerCajaActiva();
  }

  static async updateBalances(
    trx: TransactionQuery,
    id_caja: string,
    deltas: {
      venta?: number;
      cargo_tarjeta?: number;
      servicio?: number;
      efectivo?: number;
      tarjeta?: number;
      transferencia?: number;
      prepago?: number;
      anticipo?: number;
      egreso?: number;
      iva?: number;
      comision?: number;
      propina?: number;
      cuenta?: number;
      devolucion?: number;
    }
  ): Promise<void> {
    await conContextoOperacionExistente(trx, contexto =>
      registrarMovimientoCobro(id_caja, deltas, contexto)
    );
  }

  static async summary(): Promise<any> {
    try {
      const row = await query<any[]>(
        `
      SELECT c.*,
             COALESCE((
               SELECT SUM(r.monto)
               FROM retiros_caja r
               WHERE r.caja_id = c.id_caja
             ), 0) as retiro_total,
             (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) as usuario_apertura,
             EXISTS(
               SELECT 1 FROM solicitudes_cierre_caja s
               WHERE s.caja_id = c.id_caja AND s.estado = 'pendiente'
             ) as cierre_pendiente,
             ${this.SQL_CIERRE_ESTANCADO} as cierre_estancado
      FROM cajas c
      LEFT JOIN usuarios u ON c.usuario_id_apertura = u.id_usuario
      WHERE c.estado = 1
      ORDER BY c.fecha_apertura DESC LIMIT 1
    `,
        [getNowInBusinessTimezone()]
      );

      if (row.length === 0) return { balance_total: 0, cajas_abiertas: 0 };
      const cajaRow = row[0];

      const stats = {
        ventas: (
          await query<any[]>(
            'SELECT COUNT(*) AS cantidad, COALESCE(AVG(total), 0) AS promedio FROM ventas WHERE estado = 1 AND fecha_crea >= ?',
            [cajaRow.fecha_apertura]
          )
        )[0],
        servicios: (
          await query<any[]>(
            'SELECT COUNT(*) AS cantidad, COALESCE(AVG(total), 0) AS promedio FROM servicios WHERE estado = 1 AND fecha_crea >= ?',
            [cajaRow.fecha_apertura]
          )
        )[0]
      };

      const balanceTotal =
        efectivoBaseCaja(cajaRow) +
        Number(cajaRow.tarjeta || 0) +
        Number(cajaRow.transferencia || 0) -
        devolucionesDe(cajaRow);

      const prepagoMetrics = await this.getPrepagoMetrics(
        cajaRow.fecha_apertura,
        cajaRow.fecha_cierre
      );

      // El monto de cierre descuenta los saldos prepago que los clientes todavía
      // tienen cargados: ese dinero se cobró en un turno anterior y no está en el
      // cajón. `balance_total` se deja como está porque lo usan otras vistas.
      const saldoClientesPendiente = Number(prepagoMetrics.prepago_pendiente_clientes || 0);

      return {
        ...this.mapCajaFromDB({ ...cajaRow, ...prepagoMetrics }),
        balance_total: balanceTotal,
        saldo_clientes_pendiente: saldoClientesPendiente,
        monto_cierre_previsto: montoCierreCaja(cajaRow, saldoClientesPendiente),
        total_ventas: Number(cajaRow.venta || 0),
        cantidad_ventas: stats.ventas.cantidad,
        promedio_venta: stats.ventas.promedio,
        total_servicios: Number(cajaRow.servicio || 0),
        cantidad_servicios: stats.servicios.cantidad,
        promedio_servicio: stats.servicios.promedio,

        total_tarjeta: Number(cajaRow.tarjeta || 0),
        total_transferencia: Number(cajaRow.transferencia || 0),
        total_anticipo: cajaRow.anticipo || 0,
        total_devoluciones: Number(cajaRow.devolucion || 0),
        total_iva: Number(cajaRow.iva || 0),
        total_propina: Number(cajaRow.propina || 0),
        total_comisiones: Number(cajaRow.comision || 0),
        efectivo_en_caja: efectivoBaseCaja(cajaRow),
        total_efectivo: efectivoBaseCaja(cajaRow)
      };
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en summary:', { err });
      throw new DatabaseError('Error al obtener resumen de caja', err);
    }
  }

  static async getAll(): Promise<CajaType[]> {
    try {
      const results = await query<any[]>(
        `
      SELECT c.*,
             (CAST(u1.nombre AS text) || CAST(' ' AS text) || CAST(u1.apellido AS text)) as cajero_nombre,
             COALESCE((
               SELECT SUM(r.monto)
               FROM retiros_caja r
               WHERE r.caja_id = c.id_caja
             ), 0) as retiro_total,
             EXISTS(
               SELECT 1 FROM solicitudes_cierre_caja s
               WHERE s.caja_id = c.id_caja AND s.estado = 'pendiente'
             ) as cierre_pendiente,
             (SELECT s.solicitado_por FROM solicitudes_cierre_caja s
               WHERE s.caja_id = c.id_caja AND s.estado = 'pendiente'
               ORDER BY s.fecha_solicitud DESC LIMIT 1) as cierre_solicitado_por,
             (SELECT s.ultimo_aviso_en FROM solicitudes_cierre_caja s
               WHERE s.caja_id = c.id_caja AND s.estado = 'pendiente'
               ORDER BY s.fecha_solicitud DESC LIMIT 1) as cierre_ultimo_aviso_en,
             ${this.SQL_CIERRE_ESTANCADO} as cierre_estancado
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      WHERE c.estado IN (0, 1) ORDER BY c.fecha_apertura DESC
    `,
        [getNowInBusinessTimezone()]
      );
      return results.map(row => this.mapCajaFromDB(row));
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getAll:', { err });
      throw new DatabaseError('Error al obtener lista de cajas', err);
    }
  }

  static async getById(id: string): Promise<CajaType | null> {
    try {
      const res = await query<any[]>(
        `
      SELECT c.*,
             (CAST(u1.nombre AS text) || CAST(' ' AS text) || CAST(u1.apellido AS text)) as cajero_nombre,
             u1.foto as cajero_foto,
             (CAST(u2.nombre AS text) || CAST(' ' AS text) || CAST(u2.apellido AS text)) as cajero_cierre_nombre,
             u2.foto as cajero_cierre_foto,
             COALESCE((
               SELECT SUM(r.monto)
               FROM retiros_caja r
               WHERE r.caja_id = c.id_caja
             ), 0) as retiro_total,
             EXISTS(
               SELECT 1 FROM solicitudes_cierre_caja s
               WHERE s.caja_id = c.id_caja AND s.estado = 'pendiente'
             ) as cierre_pendiente,
             (SELECT s.solicitado_por FROM solicitudes_cierre_caja s
               WHERE s.caja_id = c.id_caja AND s.estado = 'pendiente'
               ORDER BY s.fecha_solicitud DESC LIMIT 1) as cierre_solicitado_por,
             (SELECT s.ultimo_aviso_en FROM solicitudes_cierre_caja s
               WHERE s.caja_id = c.id_caja AND s.estado = 'pendiente'
               ORDER BY s.fecha_solicitud DESC LIMIT 1) as cierre_ultimo_aviso_en,
             ${this.SQL_CIERRE_ESTANCADO} as cierre_estancado
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      LEFT JOIN usuarios u2 ON c.usuario_id_cierre = u2.id_usuario
      WHERE c.id_caja = ?
    `,
        [getNowInBusinessTimezone(), id]
      );
      if (res.length === 0) return null;

      const prepagoMetrics = await this.getPrepagoMetrics(
        res[0].fecha_apertura,
        res[0].fecha_cierre
      );
      return this.mapCajaFromDB({ ...res[0], ...prepagoMetrics });
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getById:', { id, err });
      throw new DatabaseError(`Error al obtener caja ${id}`, err);
    }
  }

  static async open(usuario_id: string, monto_apertura: number): Promise<CajaType | null> {
    try {
      const open = await query<any[]>(
        'SELECT id_caja, usuario_id_apertura FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      );
      if (open.length > 0) {
        const currentOpenUserId = String(open[0].usuario_id_apertura || '');
        if (currentOpenUserId === String(usuario_id)) {
          throw new ConflictError('Usuario ya tiene una caja abierta');
        }
        throw new ConflictError('Ya existe una caja abierta');
      }

      const id = generateUUID();
      const now = getNowInBusinessTimezone();
      await BaseRepository.insert(query, 'cajas', {
        id_caja: id,
        fecha_apertura: now,
        usuario_id_apertura: usuario_id,
        monto_apertura,
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        monto_cierre: 0,
        estado: 1
      });
      return await this.getById(id);
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en open:', { usuario_id, err });
      if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al abrir caja para usuario ${usuario_id}`, err);
    }
  }

  static async update(id: string, data: any): Promise<CajaType | null> {
    try {
      await BaseRepository.update(query, 'cajas', 'id_caja', id, data);
      return await this.getById(id);
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en update:', { id, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al actualizar caja ${id}`, err);
    }
  }

  /**
   * Monto de cierre: lo que hay en el cajón (apertura + efectivo + tarjeta +
   * transferencia) menos lo devuelto y menos los saldos que los clientes todavía
   * tienen cargados. Ese prepago se cobró en un turno anterior y no está en el
   * cajón: sin descontarlo, el arqueo da faltante por plata que nunca estuvo ahí.
   */
  static calcularMontoCierre(
    caja: {
      monto_apertura?: number;
      efectivo?: number;
      tarjeta?: number;
      transferencia?: number;
      /** Como lo expone el dominio (`CajaType`). */
      devoluciones?: number;
      /** Como viene en la fila cruda de `cajas` (la columna se llama `devolucion`). */
      devolucion?: number;
    },
    saldosClientes: number
  ): number {
    // La resta del cajón vive en `lib/business/cajaEfectivo` y la comparten tarjeta,
    // detalle, diálogo de retiro y cierre: acá solo se engancha el saldo de clientes,
    // que se lee aparte (`saldosPendientesClientes`) y no de la fila.
    return montoCierreCaja(caja, saldosClientes);
  }

  /** Saldos que los clientes todavía tienen cargados (`clientes.saldo > 0`). */
  static async saldosPendientesClientes(trx?: TransactionQuery | typeof query): Promise<number> {
    const qFunc = trx || query;
    try {
      const [row] = await qFunc<any[]>(
        'SELECT COALESCE(SUM(saldo), 0) as saldo_pendiente FROM clientes WHERE saldo > 0'
      );
      return Number(row?.saldo_pendiente || 0);
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en saldosPendientesClientes:', { err });
      throw new DatabaseError('Error al obtener los saldos pendientes de clientes', err);
    }
  }

  /** Solicitud de cierre esperando autorización, si la hay. */
  static async getSolicitudCierrePendiente(cajaId: string): Promise<SolicitudCierreCaja | null> {
    try {
      const rows = await query<SolicitudCierreCaja[]>(
        `SELECT s.id, s.caja_id, s.token, s.estado, s.monto_cierre_calculado,
                s.saldo_clientes_descontado, s.solicitado_por, s.motivo, s.fecha_solicitud,
                s.ultimo_aviso_en
         FROM solicitudes_cierre_caja s
         WHERE s.caja_id = ? AND s.estado = 'pendiente'
         ORDER BY s.fecha_solicitud DESC
         LIMIT 1`,
        [cajaId]
      );
      return rows[0] ?? null;
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getSolicitudCierrePendiente:', {
        cajaId,
        err
      });
      throw new DatabaseError('Error al obtener la solicitud de cierre', err);
    }
  }

  /**
   * Segundos que faltan para poder reenviar el aviso del cierre pendiente.
   *
   * 0 = se puede reenviar ya (o no hay cierre pendiente). El cálculo se hace en SQL
   * comparando los timestamps entre sí, porque `ultimo_aviso_en` se escribe en hora de
   * negocio y restarlo en JS contra el reloj del proceso mezclaría dos husos.
   */
  static async segundosParaReenviarAviso(cajaId: string): Promise<number> {
    try {
      const [row] = await query<any[]>(
        `SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
                  (ultimo_aviso_en + (interval '1 second' * ?)) - CAST(? AS timestamp)
                )))) AS faltan
         FROM solicitudes_cierre_caja
         WHERE caja_id = ? AND estado = 'pendiente'
         ORDER BY fecha_solicitud DESC
         LIMIT 1`,
        [AVISO_CIERRE_ENFRIAMIENTO_MS / 1000, getNowInBusinessTimezone(), cajaId]
      );
      return Number(row?.faltan ?? 0);
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en segundosParaReenviarAviso:', { cajaId, err });
      throw new DatabaseError('Error al calcular el reenvío del aviso de cierre', err);
    }
  }

  /**
   * Marca que el aviso del cierre salió (el primero o un reenvío).
   *
   * Se llama **después** de mandar el WhatsApp: si el envío falla, el enfriamiento no se
   * consume y el cajero puede volver a intentar enseguida. Por el mismo motivo, el contador
   * de avisos solo sube acá: lo que no salió, no se cuenta.
   */
  static async registrarAvisoCierre(token: string): Promise<string> {
    try {
      const ahora = getNowInBusinessTimezone();
      await query(
        `UPDATE solicitudes_cierre_caja
         SET ultimo_aviso_en = ?, avisos_enviados = avisos_enviados + 1
         WHERE token = ? AND estado = 'pendiente'`,
        [ahora, token]
      );
      return ahora;
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en registrarAvisoCierre:', { err });
      throw new DatabaseError('Error al registrar el aviso del cierre de caja', err);
    }
  }

  /**
   * Solicitud de cierre por token, con el desglose que el administrador necesita
   * para decidir. Se busca por token y no por caja a propósito: es el link que
   * llegó por WhatsApp, y tiene que seguir abriendo después de un reintento.
   *
   * Devuelve el mismo detalle que lleva el mensaje de WhatsApp —movimiento del turno
   * (ventas, servicios, propinas, comisiones, anticipos, IVA), dinero en cajón y prepago
   * de clientes—, para que el administrador vea en pantalla lo mismo que leyó en el chat
   * antes de autorizar o rechazar.
   */
  static async getSolicitudCierreByToken(token: string): Promise<any | null> {
    try {
      const rows = await query<any[]>(
        `SELECT s.id, s.caja_id, s.token, s.estado, s.monto_cierre_calculado,
                s.saldo_clientes_descontado, s.solicitado_por, s.motivo,
                s.fecha_solicitud, s.fecha_resolucion, s.resuelto_por,
                s.avisos_enviados, s.ultimo_aviso_en,
                GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (
                  CAST(? AS timestamp) - s.fecha_solicitud
                )) / 60))::int as minutos_sin_respuesta,
                c.fecha_apertura, c.fecha_cierre, c.monto_apertura, c.efectivo, c.tarjeta,
                c.transferencia, c.devolucion, c.estado as caja_estado,
                c.venta, c.servicio, c.propina, c.comision, c.anticipo, c.iva,
                COALESCE((
                  SELECT SUM(r.monto) FROM retiros_caja r WHERE r.caja_id = c.id_caja
                ), 0) as retiro_total,
                (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) as cajero_nombre
         FROM solicitudes_cierre_caja s
         INNER JOIN cajas c ON c.id_caja = s.caja_id
         LEFT JOIN usuarios u ON c.usuario_id_apertura = u.id_usuario
         WHERE s.token = ?
         LIMIT 1`,
        [getNowInBusinessTimezone(), token]
      );

      const solicitud = rows[0];
      if (!solicitud) return null;

      // El prepago no vive en la tabla de cajas: se calcula con los movimientos del
      // turno y los saldos actuales, igual que en el aviso de WhatsApp.
      const prepagoMetrics = await this.getPrepagoMetrics(
        solicitud.fecha_apertura,
        solicitud.fecha_cierre
      );

      return { ...solicitud, ...prepagoMetrics };
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getSolicitudCierreByToken:', { err });
      throw new DatabaseError('Error al obtener la solicitud de cierre por token', err);
    }
  }

  /**
   * El cajero pide el cierre. No cierra nada: deja la solicitud 'pendiente' y la
   * caja sigue abierta hasta que el administrador autorice. La clave de
   * idempotencia es el token, que viaja en el link del WhatsApp.
   *
   * Si ya hay una solicitud pendiente del mismo turno, el comportamiento depende de si
   * quedó sin respuesta:
   *   - recién pedida (dentro de `AVISO_CIERRE_VENTANA_MS`) → `ConflictError`, para no crear
   *     dos autorizaciones del mismo cierre;
   *   - sin respuesta pasada la ventana → se expira la vieja y se crea una nueva con otro
   *     token, así el aviso vuelve a salir desde cero. Sin esto, un cierre que nadie contestó
   *     quedaría bloqueado para siempre por el índice único parcial.
   */
  static async solicitarCierre(
    id_caja: string,
    solicitante: { usuarioId?: string | null; nombre: string; motivo?: string | null }
  ): Promise<{
    token: string;
    caja: CajaType;
    monto_cierre_calculado: number;
    saldo_clientes_descontado: number;
    /** `true` cuando reemplazó una solicitud que quedó sin respuesta. */
    reemplazo: boolean;
  }> {
    try {
      const caja = await this.getById(id_caja);
      if (!caja) throw new NotFoundError('Caja');
      if (Number(caja.estado) !== 1) throw new ConflictError('La caja ya está cerrada');

      const saldos = await this.saldosPendientesClientes();
      const montoCierre = this.calcularMontoCierre(caja, saldos);
      const id = generateUUID();
      const token = generateUUID();
      const now = getNowInBusinessTimezone();

      let reemplazo = false;

      // Todo en una transacción: reclamar la pendiente con `FOR UPDATE` y crear la nueva
      // juntas evita que dos pedidos simultáneos dejen dos solicitudes vivas del mismo turno.
      await withTransaction(async trx => {
        const pendientes = await trx<any[]>(
          `SELECT id,
                  (fecha_solicitud <= (CAST(? AS timestamp) - (interval '1 second' * ?))) AS estancada
           FROM solicitudes_cierre_caja
           WHERE caja_id = ? AND estado = 'pendiente'
           ORDER BY fecha_solicitud DESC
           FOR UPDATE`,
          [now, AVISO_CIERRE_VENTANA_MS / 1000, id_caja]
        );

        if (pendientes.length > 0) {
          if (!pendientes[0].estancada) {
            throw new ConflictError(
              'Ya hay una solicitud de cierre de esta caja esperando autorización'
            );
          }

          await trx(
            `UPDATE solicitudes_cierre_caja
             SET estado = 'expirada', fecha_resolucion = ?, resuelto_por = ?, motivo_rechazo = ?
             WHERE id = ?`,
            [
              now,
              'Sistema (sin respuesta)',
              'El administrador no respondió al cierre dentro del plazo',
              pendientes[0].id
            ]
          );
          reemplazo = true;
        }

        await BaseRepository.insert(trx, 'solicitudes_cierre_caja', {
          id,
          caja_id: id_caja,
          token,
          estado: 'pendiente',
          monto_cierre_calculado: montoCierre,
          saldo_clientes_descontado: saldos,
          solicitado_por: solicitante.nombre,
          usuario_id_solicita: solicitante.usuarioId ?? null,
          motivo: solicitante.motivo?.trim() || 'Cierre de turno',
          fecha_solicitud: now,
          // El primer aviso sale enseguida (lo manda el helper justo después).
          ultimo_aviso_en: now,
          avisos_enviados: 1
        });

        await trx('UPDATE cajas SET cierre_solicitado_en = ? WHERE id_caja = ?', [now, id_caja]);
      });

      return {
        token,
        caja,
        monto_cierre_calculado: montoCierre,
        saldo_clientes_descontado: saldos,
        reemplazo
      };
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en solicitarCierre:', { id_caja, err });
      if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
      throw new DatabaseError(`Error al solicitar el cierre de la caja ${id_caja}`, err);
    }
  }

  /**
   * Cierres pendientes cuyo último aviso ya venció y que siguen dentro de la ventana de
   * recordatorios: los que el cron debe volver a avisar (y no como reenvío manual, que ya
   * tiene su propio enfriamiento en `segundosParaReenviarAviso`).
   *
   * Fuera de la ventana no devuelve nada: insistir para siempre convertiría el WhatsApp del
   * administrador en spam y Twilio termina limitando el número. Pasada la ventana, la salida
   * es que el cajero pida el cierre de nuevo (`solicitarCierre` expira la vieja).
   */
  static async cierresPendientesParaRecordar(
    intervaloMs: number = AVISO_CIERRE_REINTENTO_MS,
    ventanaMs: number = AVISO_CIERRE_VENTANA_MS
  ): Promise<
    Array<{
      caja_id: string;
      token: string;
      solicitado_por: string;
      motivo: string | null;
      monto_cierre_calculado: number;
      saldo_clientes_descontado: number;
      ultimo_aviso_en: string;
    }>
  > {
    try {
      const ahora = getNowInBusinessTimezone();
      return await query(
        `SELECT s.caja_id, s.token, s.solicitado_por, s.motivo,
                s.monto_cierre_calculado, s.saldo_clientes_descontado, s.ultimo_aviso_en
         FROM solicitudes_cierre_caja s
         INNER JOIN cajas c ON c.id_caja = s.caja_id
         WHERE s.estado = 'pendiente'
           AND c.estado = 1
           AND s.ultimo_aviso_en IS NOT NULL
           AND s.ultimo_aviso_en <= (CAST(? AS timestamp) - (interval '1 second' * ?))
           AND s.fecha_solicitud > (CAST(? AS timestamp) - (interval '1 second' * ?))
         ORDER BY s.ultimo_aviso_en ASC`,
        [ahora, intervaloMs / 1000, ahora, ventanaMs / 1000]
      );
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en cierresPendientesParaRecordar:', { err });
      throw new DatabaseError('Error al buscar cierres pendientes para recordar', err);
    }
  }

  /**
   * El administrador resuelve la solicitud: con 'confirmar' se cierra la caja,
   * con 'rechazar' la caja sigue abierta.
   *
   * Todo pasa en una sola transacción y la fila se reclama con `FOR UPDATE` antes
   * de tocar nada, así que dos toques seguidos del link (o el link y una respuesta
   * por WhatsApp a la vez) no pueden cerrar la caja dos veces.
   *
   * El descuento de saldos se recalcula al autorizar, no se arrastra desde la
   * solicitud: lo que importa es lo que los clientes tienen cargado **al cerrar**.
   */
  static async procesarSolicitudCierre(
    token: string,
    action: 'confirmar' | 'rechazar',
    resuelto: { usuarioId?: string | null; nombre: string }
  ): Promise<{
    estado: 'aprobada' | 'rechazada';
    caja: CajaType | null;
    saldo_clientes_descontado: number;
  }> {
    let cajaId: string;
    let estado: 'aprobada' | 'rechazada';
    let saldos = 0;

    try {
      const resultado = await withTransaction(async trx => {
        const rows = await trx<any[]>(
          `SELECT id, caja_id FROM solicitudes_cierre_caja
           WHERE token = ? AND estado = 'pendiente'
           FOR UPDATE`,
          [token]
        );
        if (!rows.length) throw new NotFoundError('Solicitud de cierre pendiente');

        const solicitud = rows[0];
        const now = getNowInBusinessTimezone();

        if (action === 'rechazar') {
          await trx(
            `UPDATE solicitudes_cierre_caja
             SET estado = 'rechazada', fecha_resolucion = ?, resuelto_por = ?
             WHERE id = ?`,
            [now, resuelto.nombre, solicitud.id]
          );
          await trx('UPDATE cajas SET cierre_solicitado_en = NULL WHERE id_caja = ?', [
            solicitud.caja_id
          ]);
          return { cajaId: solicitud.caja_id as string, estado: 'rechazada' as const, saldos: 0 };
        }

        const caja = await BaseRepository.findOne<any>(trx, 'cajas', 'id_caja', solicitud.caja_id);
        if (!caja) throw new NotFoundError('Caja');
        if (Number(caja.estado) !== 1) throw new ConflictError('La caja ya estaba cerrada');

        const saldosActuales = await this.saldosPendientesClientes(trx);

        // El que cierra es el administrador que autoriza. Por el link público no
        // hay sesión, así que puede quedar sin usuario: quién autorizó queda igual
        // registrado en `resuelto_por` de la solicitud.
        await this.close(solicitud.caja_id, resuelto.usuarioId ?? null, {
          trx,
          saldoClientesDescontado: saldosActuales
        });

        await trx(
          `UPDATE solicitudes_cierre_caja
           SET estado = 'aprobada', fecha_resolucion = ?, resuelto_por = ?,
               saldo_clientes_descontado = ?, monto_cierre_calculado = ?
           WHERE id = ?`,
          [
            now,
            resuelto.nombre,
            saldosActuales,
            this.calcularMontoCierre(caja as CajaType, saldosActuales),
            solicitud.id
          ]
        );

        return {
          cajaId: solicitud.caja_id as string,
          estado: 'aprobada' as const,
          saldos: saldosActuales
        };
      });

      cajaId = resultado.cajaId;
      estado = resultado.estado;
      saldos = resultado.saldos;
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en procesarSolicitudCierre:', { token, err });
      if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
      throw new DatabaseError('Error al procesar la solicitud de cierre', err);
    }

    // La lectura va **después** del commit: leer la caja dentro de la transacción
    // devolvería la fila vieja, de una conexión distinta.
    return { estado, caja: await this.getById(cajaId), saldo_clientes_descontado: saldos };
  }

  static async close(
    id: string,
    usuario_id_cierre: string | null,
    options: { trx?: TransactionQuery; saldoClientesDescontado?: number } = {}
  ): Promise<CajaType | null> {
    const qFunc = options.trx || query;
    try {
      const caja = await BaseRepository.findOne<any>(qFunc, 'cajas', 'id_caja', id);
      if (!caja || Number(caja.estado) !== 1) throw new NotFoundError('Caja abierta');

      // Los saldos que los clientes todavía tienen cargados no están en el cajón:
      // se cobraron en un turno anterior. Se descuentan del monto de cierre y se
      // guardan, para que el detalle de la caja muestre el descuento en vez de un
      // faltante inexplicable.
      const saldoClientes =
        options.saldoClientesDescontado ?? (await this.saldosPendientesClientes(qFunc));

      const montoCierre = this.calcularMontoCierre(caja as CajaType, saldoClientes);

      await qFunc(`
      UPDATE logins SET estado = 0 WHERE estado = 1
    `);

      const now = getNowInBusinessTimezone();
      await BaseRepository.update(qFunc, 'cajas', 'id_caja', id, {
        usuario_id_cierre,
        fecha_cierre: now,
        monto_cierre: montoCierre,
        saldo_clientes_descontado: saldoClientes,
        cierre_solicitado_en: null,
        estado: 0
      });

      // Dentro de una transacción la lectura por `query` vería la fila vieja.
      return options.trx ? null : await this.getById(id);
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en close:', { id, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al cerrar caja ${id}`, err);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await BaseRepository.update(query, 'cajas', 'id_caja', id, { estado: -1 });
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en delete:', { id, err });
      throw new DatabaseError(`Error al eliminar caja ${id}`, err);
    }
  }
}
