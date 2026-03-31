import { generateUUID, withTransaction, query } from '@/lib/database/db';
import { ServiceCreateSchema } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { RoomManager } from '@/lib/services/RoomManager';
import { sendNotificationToAll } from '@/lib/api/sseService';

export class ServiceService {
  /**
   * Procesa la creación de un servicio de anfitriona, gestionando comisiones,
   * piezas, y saldos de prepago.
   */
  static async createService(body: any, createdBy: string) {
    const v = ServiceCreateSchema.parse(body);
    const servicioId = generateUUID();
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = getNowInBusinessTimezone(v.device_date);
    
    const cajaId = await CashRegisterRepository.getCurrentCajaId();
    const numAnfitrionas = Math.max(1, v.usuarios.length);
    const precioServicioInput = Number(v.precio_servicio || 0);
    
    // Obtener configuración de comisión de la habitación
    // Si la habitación tiene comision_anfitriona > 0, se divide entre las anfitrionas
    // Si no, cada anfitriona recibe el precio completo del input (no se divide)
    let comisionHabitacion = 0;
    if (v.habitacion_id) {
      const habitacion = await query<any[]>('SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?', [v.habitacion_id]);
      comisionHabitacion = Number(habitacion[0]?.comision_anfitriona || 0);
    }

    // Si la habitación tiene comisión fija, se divide entre las anfitrionas
    // Si no, cada anfitriona recibe el precio del input (multiplicado por anfitrionas = total)
    const tieneComisionHabitacion = comisionHabitacion > 0;
    const comisionIndividual = tieneComisionHabitacion
      ? Math.floor(comisionHabitacion / numAnfitrionas)
      : precioServicioInput;
    const comisionTotal = tieneComisionHabitacion
      ? comisionHabitacion
      : precioServicioInput * numAnfitrionas;

    const result = await withTransaction(async (trx) => {
      // 1. Deducción de Saldo del Cliente
      // Si el cliente tiene saldo, siempre se descuenta lo que alcance (hasta el total).
      // Si el saldo excede el total, el saldo queda en 0 y se usa todo para este servicio.
      // El resto (si el saldo no cubre el total) lo cubre el método de pago seleccionado.
      let prepagoMonto = 0;

      if (v.cliente_id) {
        const clients = await trx<any[]>('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [v.cliente_id]);
        const saldoDisponible = Number(clients[0]?.saldo || 0);

        if (saldoDisponible > 0) {
          // Descontar el mínimo entre el saldo disponible y el total del servicio
          prepagoMonto = Math.min(saldoDisponible, Number(v.total || 0));

          await trx('UPDATE clientes SET saldo = GREATEST(0, saldo - ?) WHERE id_cliente = ?', [prepagoMonto, v.cliente_id]);

          await trx(
            'INSERT INTO clientes_prepago_movimientos (id_movimiento, cliente_id, tipo, monto, metodo_pago, venta_id, usuario_id, fecha_crea, metadatos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateUUID(), v.cliente_id, 'CONSUMO', prepagoMonto, 'prepago', servicioId, createdBy, now, JSON.stringify({ concepto: `Pago servicio ${codigo}` })]
          );
        }
      }

      // 2. Insertar Servicio (vía Repository)
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
        estado: 2, // Siempre inicia en estado 2 (en servicio)
        fecha_crea: now,
        pagos_mixtos: v.pagos_mixtos ? JSON.stringify(v.pagos_mixtos) : null
      });

      // 2b. Actualizar estado de habitación a ocupada (2)
      if (v.habitacion_id) {
        await trx('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [v.habitacion_id]);
      }

      // 3. Gestión de Conflictos en RoomManager
      await RoomManager.pauseConflictingServices(trx, v.usuarios, servicioId);

      // 4. Cálculo y Distribución de Comisiones
      const commissionId = generateUUID();
      await trx(
        'INSERT INTO comisiones (id_comision, servicio_id, monto, estado, fecha_crea) VALUES (?, ?, ?, 1, ?)',
        [commissionId, servicioId, comisionTotal, now]
      );

      for (const uId of v.usuarios) {
        await trx(
          'INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado, fecha_crea) VALUES (?, ?, ?, ?, 1, ?)',
          [generateUUID(), commissionId, uId, comisionIndividual, now]
        );

        // En detalle_servicios, la comisión es la parte que le corresponde a cada anfitriona
        await trx(
          'INSERT INTO detalle_servicios (id_detalle_servicio, usuario_id, servicio_id, comision, fecha_crea) VALUES (?, ?, ?, ?, ?)',
          [generateUUID(), uId, servicioId, comisionIndividual, now]
        );
      }

      // 4b. Registrar clientes del servicio (si hay clientes seleccionados)
      const clientesArray = v.clientes && v.clientes.length > 0 ? v.clientes : (v.cliente_id ? [v.cliente_id] : []);
      for (const clienteId of clientesArray) {
        if (clienteId) {
          await trx(
            'INSERT INTO detalle_servicios_clientes (id, servicio_id, cliente_id) VALUES (?, ?, ?)',
            [generateUUID(), servicioId, clienteId]
          );
        }
      }

      // 5. Actualizar disponibilidad de anfitrionas - marcar como ocupadas directamente
      for (const uId of v.usuarios) {
        await trx('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [uId]);
      }

      // 6. Actualizar Balances de Caja
      if (cajaId) {
        const commToCaja = comisionTotal;
        // El monto cubierto por el método de pago principal es el total menos lo que cubrió el saldo
        const montoMetodoPrincipal = Number(v.total) - prepagoMonto;

        await CashRegisterRepository.updateBalances(trx, cajaId, {
          servicio: v.total - v.iva,
          efectivo: v.metodo_pago === 'efectivo' ? montoMetodoPrincipal : 0,
          tarjeta: v.metodo_pago === 'tarjeta' ? montoMetodoPrincipal : 0,
          transferencia: v.metodo_pago === 'transferencia' ? montoMetodoPrincipal : 0,
          prepago: prepagoMonto,
          iva: v.iva,
          comision: commToCaja
        });
      }

      return { id: servicioId, codigo, tiempo: v.tiempo, total: v.total };
    });

    // Notificar a todos los clientes SSE para que actualicen los timers activos (incluye habitacion_comision)
    sendNotificationToAll('timers_updated', { timestamp: now });

    return result;
  }
}
