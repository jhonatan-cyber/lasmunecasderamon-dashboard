import { generateUUID, withTransaction, query } from '@/lib/database/db';
import { ServiceCreateSchema } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { RoomManager } from '@/lib/services/RoomManager';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { invalidateDashboardCache } from '@/lib/cache/dashboardCache';
import { BusinessError } from '@/lib/errors/errors';
import { z } from 'zod';
import {
  parsePagosMixtos,
  validatePagosMixtos,
  calcularDeltasCaja,
  procesarPrepago,
  type MixedPayment
} from '@/lib/business/pagosMixtos';

type ServiceCreateInput = z.input<typeof ServiceCreateSchema>;

export class ServiceService {
  private static async getLoggedInHostessIds(
    trx: typeof query,
    userIds: string[]
  ): Promise<string[]> {
    if (!userIds.length) return [];

    const rows = await trx<any[]>(
      `SELECT DISTINCT u.id_usuario
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.rol_id
       INNER JOIN logins l ON l.usuario_id = u.id_usuario
       WHERE u.id_usuario IN (${userIds.map(() => '?').join(', ')})
         AND u.estado = 1
         AND l.estado = 1
         AND l.en_local = 1
         AND LOWER(r.nombre) = 'anfitriona'`,
      userIds
    );

    return rows.map((row: any) => row.id_usuario);
  }

  static async createService(body: ServiceCreateInput, createdBy: string) {
    const v = ServiceCreateSchema.parse(body);
    const servicioId = generateUUID();
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = getNowInBusinessTimezone(v.device_date);
    const pagosMixtos: MixedPayment[] = parsePagosMixtos(v.pagos_mixtos);

    const cajaId = await CashRegisterRepository.getCurrentCajaId();

    const result = await withTransaction(async trx => {
      let prepagoMonto = 0;
      const numAnfitrionas = Math.max(1, v.usuarios.length);
      const precioServicioInput = Number(v.precio_servicio || 0);
      const esMixto = v.metodo_pago === 'mixto';
      const prepagoSolicitado = esMixto
        ? pagosMixtos
            .filter((pago: MixedPayment) => pago.metodo === 'prepago')
            .reduce((sum: number, pago: MixedPayment) => sum + pago.monto, 0)
        : null;

      if (esMixto) {
        validatePagosMixtos(pagosMixtos, Number(v.total || 0));
      }

      if (v.cliente_id) {
        prepagoMonto = await procesarPrepago(trx, {
          clienteId: v.cliente_id,
          total: Number(v.total || 0),
          prepagoSolicitado,
          ventaId: servicioId,
          createdBy,
          now,
          codigo,
          concepto: `Pago servicio ${codigo}`
        });
      }

      // OPTIMIZACIÓN: Query ÚNICA de habitación (antes se hacía 2 veces)
      let esLibreIngreso = false;
      let comisionHabitacion = 0;
      if (v.habitacion_id) {
        const roomRows = await trx<any[]>(
          'SELECT precio, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
          [v.habitacion_id]
        );
        if (roomRows.length > 0) {
          const roomPrice = Number(roomRows[0].precio || 0);
          const roomCommission = Number(roomRows[0].comision_anfitriona || 0);
          comisionHabitacion = roomCommission;
          esLibreIngreso = roomPrice <= 0 || roomCommission <= 0;
        }
      }

      const tieneComisionHabitacion = comisionHabitacion > 0;
      const comisionIndividualBase = tieneComisionHabitacion
        ? Math.floor(comisionHabitacion / numAnfitrionas)
        : precioServicioInput;
      const comisionTotal = tieneComisionHabitacion
        ? comisionHabitacion
        : precioServicioInput * numAnfitrionas;

      await ServiceRepository.rawInsert(trx, {
        id_servicio: servicioId,
        codigo,
        cliente_id: v.cliente_id || null,
        habitacion_id: v.habitacion_id,
        precio_habitacion: v.precio_habitacion,
        precio_servicio: v.precio_servicio,
        iva: v.iva,
        sub_total: v.sub_total,
        total: v.total,
        tiempo: v.tiempo,
        metodo_pago: v.metodo_pago,
        caja_id: cajaId,
        created_by: createdBy,
        estado: esLibreIngreso && (!v.tiempo || v.tiempo <= 0) ? 1 : 2,
        es_temporal: v.es_temporal ? 1 : 0,
        servicio_original_id: v.servicio_original_id || null,
        fecha_crea: now,
        pagos_mixtos: v.pagos_mixtos ? JSON.stringify(v.pagos_mixtos) : null
      });

      if (v.habitacion_id && !esLibreIngreso) {
        await trx('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [v.habitacion_id]);
      }

      const hostessIds = await this.getLoggedInHostessIds(trx, v.usuarios);
      if (hostessIds.length !== v.usuarios.length) {
        throw new BusinessError(
          'Hay anfitrionas seleccionadas que no estan logueadas en el local',
          'HOSTESS_NOT_LOGGED_IN'
        );
      }

      await RoomManager.pauseConflictingServices(trx, hostessIds, servicioId);

      const commissionId = generateUUID();
      await trx(
        'INSERT INTO comisiones (id_comision, servicio_id, monto, estado, fecha_crea) VALUES (?, ?, ?, 1, ?)',
        [commissionId, servicioId, comisionTotal, now]
      );

      // OPTIMIZACIÓN: Batch inserts para hostesses (antes 2N queries)
      const remainder = tieneComisionHabitacion ? comisionTotal % numAnfitrionas : 0;

      const detalleComisionRows: Array<Record<string, unknown>> = [];
      const detalleServicioRows: Array<Record<string, unknown>> = [];

      for (const [index, uId] of hostessIds.entries()) {
        const comisionIndividual = comisionIndividualBase + (index === 0 ? remainder : 0);

        detalleComisionRows.push({
          id_detalle_comision: generateUUID(),
          comision_id: commissionId,
          usuario_id: uId,
          comision: comisionIndividual,
          estado: 1,
          fecha_crea: now
        });

        detalleServicioRows.push({
          id_detalle_servicio: generateUUID(),
          usuario_id: uId,
          servicio_id: servicioId,
          comision: comisionIndividual,
          fecha_crea: now
        });
      }

      if (detalleComisionRows.length > 0) {
        await ServiceService.batchInsertDetalleComisiones(trx, detalleComisionRows);
      }
      if (detalleServicioRows.length > 0) {
        await ServiceService.batchInsertDetalleServicios(trx, detalleServicioRows);
      }

      // OPTIMIZACIÓN: Batch insert para clientes (antes M queries)
      const clientesArray =
        v.clientes && v.clientes.length > 0 ? v.clientes : v.cliente_id ? [v.cliente_id] : [];
      const clientRows = clientesArray
        .filter(Boolean)
        .map(clienteId => [generateUUID(), servicioId, clienteId]);

      if (clientRows.length > 0) {
        const placeholders = clientRows.map(() => '(?, ?, ?)').join(', ');
        await trx(
          `INSERT INTO detalle_servicios_clientes (id, servicio_id, cliente_id) VALUES ${placeholders}`,
          clientRows.flat()
        );
      }

      if (cajaId) {
        if (esMixto) {
          const deltas = calcularDeltasCaja(pagosMixtos);

          await CashRegisterRepository.updateBalances(trx, cajaId, {
            servicio: Number(v.total) - Number(v.iva || 0),
            efectivo: deltas.efectivo,
            tarjeta: deltas.tarjeta,
            transferencia: deltas.transferencia,
            prepago: prepagoMonto,
            iva: v.iva,
            comision: comisionTotal
          });
        } else {
          const montoMetodoPrincipal = Number(v.total) - prepagoMonto;

          await CashRegisterRepository.updateBalances(trx, cajaId, {
            servicio: Number(v.total) - Number(v.iva || 0),
            efectivo: v.metodo_pago === 'efectivo' ? montoMetodoPrincipal : 0,
            tarjeta: v.metodo_pago === 'tarjeta' ? montoMetodoPrincipal : 0,
            transferencia: v.metodo_pago === 'transferencia' ? montoMetodoPrincipal : 0,
            prepago: prepagoMonto,
            iva: v.iva,
            comision: comisionTotal
          });
        }
      }

      return { id: servicioId, codigo, tiempo: v.tiempo, total: v.total };
    });

    sendNotificationToAll('timers_updated', { timestamp: now });

    // Invalidar caché del dashboard al crear un servicio
    invalidateDashboardCache({ userId: createdBy });

    return result;
  }

  // ================================================================
  // OPTIMIZACIÓN: Batch inserts para reducir queries N+1
  // ================================================================

  private static async batchInsertDetalleComisiones(
    trx: any,
    rows: Array<Record<string, unknown>>
  ): Promise<void> {
    const columns = ['id_detalle_comision', 'comision_id', 'usuario_id', 'comision', 'estado', 'fecha_crea'];
    const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = rows.flatMap(row => columns.map(col => row[col]));

    await trx(
      `INSERT INTO detalle_comisiones (${columns.join(', ')}) VALUES ${placeholders}`,
      values
    );
  }

  private static async batchInsertDetalleServicios(
    trx: any,
    rows: Array<Record<string, unknown>>
  ): Promise<void> {
    const columns = ['id_detalle_servicio', 'usuario_id', 'servicio_id', 'comision', 'fecha_crea'];
    const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = rows.flatMap(row => columns.map(col => row[col]));

    await trx(
      `INSERT INTO detalle_servicios (${columns.join(', ')}) VALUES ${placeholders}`,
      values
    );
  }

  static async getAll(params: Record<string, string | undefined>) {
    return await ServiceRepository.getAll(params as any);
  }

  static async getById(id: string | number) {
    return await ServiceRepository.getById(id.toString());
  }

  static async getByUser(userId: string) {
    return await ServiceRepository.getByUser(userId);
  }

  static async getByDates(startDate: string, endDate: string) {
    return await ServiceRepository.getByDates(startDate, endDate);
  }

  static async updateService(id: string | number, body: Record<string, unknown>) {
    return await ServiceRepository.updateService(id.toString(), body);
  }

  static async updateStatus(id: string | number, estado: number, userId?: string) {
    return await ServiceRepository.updateStatus(id.toString(), estado, userId);
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: string) {
    return await ServiceRepository.processAnulacion(requestId, approvedBy, status);
  }

  static async requestAnulacion(id: string, motivo: string, userId: string) {
    return await ServiceRepository.requestAnulacion(id, motivo, userId);
  }
}
