import { generateUUID, withTransaction } from '@/lib/database/db';
import { ServiceCreateSchema } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { RoomManager } from '@/lib/services/RoomManager';

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
    const precioServicioTotal = Number(v.precio_servicio || 0);
    const precioServicioUnitario = Math.floor(precioServicioTotal / numAnfitrionas);

    // Obtener configuración de comisión de la habitación
    const result = await withTransaction(async (trx) => {
      // 1. Deducción de Prepago
      if (v.metodo_pago === 'prepago' && v.cliente_id) {
        const clients = await trx<any[]>('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [v.cliente_id]);
        if (clients.length === 0 || (clients[0].saldo || 0) < v.total) {
          throw new Error('Saldo insuficiente para completar el servicio');
        }
        await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [v.total, v.cliente_id]);
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
        fecha_crea: now
      });

      // 3. Gestión de Conflictos en RoomManager
      await RoomManager.pauseConflictingServices(trx, v.usuarios, servicioId);

      // 4. Cálculo y Distribución de Comisiones
      const commissionId = generateUUID();
      await trx(
        'INSERT INTO comisiones (id_comision, servicio_id, monto, estado, fecha_crea) VALUES (?, ?, ?, 1, ?)',
        [commissionId, servicioId, precioServicioTotal, now]
      );

      for (const uId of v.usuarios) {
        await trx(
          'INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado, fecha_crea) VALUES (?, ?, ?, ?, 1, ?)',
          [generateUUID(), commissionId, uId, precioServicioUnitario, now]
        );

        await trx(
          'INSERT INTO detalle_servicios (id_detalle_servicio, usuario_id, servicio_id, comision, fecha_crea) VALUES (?, ?, ?, ?, ?)',
          [generateUUID(), uId, servicioId, precioServicioUnitario, now]
        );
      }

      // 5. Actualizar disponibilidad de anfitrionas
      await RoomManager.updateHostessServiceStatus(trx, v.usuarios, servicioId);

      // 6. Actualizar Balances de Caja
      if (cajaId) {
        const commToCaja = precioServicioTotal;

        await CashRegisterRepository.updateBalances(trx, cajaId, {
          servicio: v.total - v.iva,
          efectivo: v.metodo_pago === 'efectivo' ? v.total : 0,
          tarjeta: v.metodo_pago === 'tarjeta' ? v.total : 0,
          transferencia: v.metodo_pago === 'transferencia' ? v.total : 0,
          prepago: v.metodo_pago === 'prepago' ? v.total : 0,
          iva: v.iva,
          comision: commToCaja
        });
      }

      return { id: servicioId, codigo, tiempo: v.tiempo, total: v.total };
    });

    return result;
  }
}
