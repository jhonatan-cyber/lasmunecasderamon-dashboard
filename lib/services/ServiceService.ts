import { generateUUID, withTransaction, query } from '@/lib/database/db';
import { ServiceCreateSchema } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { RoomManager } from '@/lib/services/RoomManager';
import { sendNotificationToAll } from '@/lib/api/sseService';
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
    const numAnfitrionas = Math.max(1, v.usuarios.length);
    const precioServicioInput = Number(v.precio_servicio || 0);

    let comisionHabitacion = 0;
    if (v.habitacion_id) {
      const habitacion = await query<any[]>(
        'SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
        [v.habitacion_id]
      );
      comisionHabitacion = Number(habitacion[0]?.comision_anfitriona || 0);
    }

    const tieneComisionHabitacion = comisionHabitacion > 0;
    const comisionIndividualBase = tieneComisionHabitacion
      ? Math.floor(comisionHabitacion / numAnfitrionas)
      : precioServicioInput;
    const comisionTotal = tieneComisionHabitacion
      ? comisionHabitacion
      : precioServicioInput * numAnfitrionas;

    const result = await withTransaction(async trx => {
      let prepagoMonto = 0;
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

      let esLibreIngreso = false;
      if (v.habitacion_id) {
        const roomRows = await trx<any[]>(
          'SELECT precio, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
          [v.habitacion_id]
        );
        if (roomRows.length > 0) {
          const roomPrice = Number(roomRows[0].precio || 0);
          const roomCommission = Number(roomRows[0].comision_anfitriona || 0);
          esLibreIngreso = roomPrice <= 0 || roomCommission <= 0;
        }
      }

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

      const remainder = tieneComisionHabitacion ? comisionTotal % numAnfitrionas : 0;

      for (const [index, uId] of hostessIds.entries()) {
        const comisionIndividual = comisionIndividualBase + (index === 0 ? remainder : 0);

        await trx(
          'INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado, fecha_crea) VALUES (?, ?, ?, ?, 1, ?)',
          [generateUUID(), commissionId, uId, comisionIndividual, now]
        );

        await trx(
          'INSERT INTO detalle_servicios (id_detalle_servicio, usuario_id, servicio_id, comision, fecha_crea) VALUES (?, ?, ?, ?, ?)',
          [generateUUID(), uId, servicioId, comisionIndividual, now]
        );
      }

      const clientesArray =
        v.clientes && v.clientes.length > 0 ? v.clientes : v.cliente_id ? [v.cliente_id] : [];
      for (const clienteId of clientesArray) {
        if (clienteId) {
          await trx(
            'INSERT INTO detalle_servicios_clientes (id, servicio_id, cliente_id) VALUES (?, ?, ?)',
            [generateUUID(), servicioId, clienteId]
          );
        }
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

    return result;
  }
}
