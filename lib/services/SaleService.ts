import { generateUUID, withTransaction, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { SaleCreateSchema } from '@/lib/business/schemas';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';
import { AuditRepository } from '@/lib/repositories/AuditRepository';
import { TipRepository } from '@/lib/repositories/TipRepository';
import { RoomManager } from '@/lib/services/RoomManager';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { logger } from '@/lib/utils/logger';

type MixedPayment = {
  metodo: string;
  monto: number;
};

export class SaleService {
  /**
   * Procesa la creación de una venta, incluyendo deducción de prepago,
   * gestión de conflictos de habitación/anfitrionas y actualización de caja.
   */
  static async createSale(body: any, createdBy: string) {
logger.debug('[SaleService] createSale - body:', { body });
    const validated = SaleCreateSchema.parse(body);
    logger.debug('[SaleService] validated:', { validated });
    const skipClientPrepago = Boolean(body?.skip_client_prepago || body?.origen === 'cuenta');
    
    // Usar el body original si validated no tiene pedido_id
    const pedidoId = validated.pedido_id || body.pedido_id || body.id_pedido;
    const clienteId = validated.cliente_id || body.cliente_id;
    
    logger.debug('[SaleService] pedidoId:', pedidoId, 'clienteId:', clienteId);
    
    const ventaId = generateUUID();
    const codigo = validated.codigo || Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = getNowInBusinessTimezone(validated.device_date);
    const pagosMixtos: MixedPayment[] = Array.isArray(validated.pagos_mixtos)
      ? validated.pagos_mixtos
          .map((pago: any) => ({
            metodo: String(pago?.metodo || ''),
            monto: Number(pago?.monto || 0),
          }))
          .filter((pago: MixedPayment) => pago.metodo && pago.monto > 0)
      : [];

    const cajaId = await CashRegisterRepository.getCurrentCajaId();
    const totalComisionCalculada = validated.detalles.reduce(
      (sum, detalle) => sum + Number(detalle.comision || 0),
      0
    );
    const totalComision = Number(validated.total_comision || 0) > 0
      ? Number(validated.total_comision || 0)
      : totalComisionCalculada;

    const result = await withTransaction(async (trx) => {
      // 1. Deducción de Saldo del Cliente
      // Si el cliente tiene saldo, siempre se descuenta lo que alcance (hasta el total)
      let prepagoMonto = 0;
      const esMixto = validated.metodo_pago === 'mixto';
      const prepagoSolicitado = esMixto
        ? pagosMixtos
            .filter((pago: MixedPayment) => pago.metodo === 'prepago')
            .reduce((sum: number, pago: MixedPayment) => sum + pago.monto, 0)
        : null;

      if (esMixto) {
        const totalPagosMixtos = pagosMixtos.reduce(
          (sum: number, pago: MixedPayment) => sum + pago.monto,
          0
        );

        if (pagosMixtos.length < 2) {
          throw new Error('Pago mixto invalido: se requieren al menos 2 metodos');
        }

        if (Math.abs(totalPagosMixtos - Number(validated.total || 0)) > 1) {
          throw new Error('Pago mixto invalido: la suma debe ser igual al total de la venta');
        }
      }

      if (clienteId && !skipClientPrepago) {
        const clients = await trx<any[]>('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [clienteId]);
        const saldoDisponible = Number(clients[0]?.saldo || 0);

        if (saldoDisponible > 0 && prepagoSolicitado !== 0) {
          prepagoMonto =
            prepagoSolicitado === null
              ? Math.min(saldoDisponible, Number(validated.total || 0))
              : prepagoSolicitado;

          if (prepagoSolicitado !== null && prepagoSolicitado > saldoDisponible) {
            throw new Error('Saldo insuficiente para el monto de prepago seleccionado');
          }

          await trx('UPDATE clientes SET saldo = GREATEST(0, saldo - ?) WHERE id_cliente = ?', [prepagoMonto, clienteId]);
          await trx(`
            INSERT INTO clientes_prepago_movimientos 
            (id_movimiento, cliente_id, tipo, monto, metodo_pago, venta_id, usuario_id, fecha_crea, metadatos)
            VALUES (?, ?, 'CONSUMO', ?, 'prepago', ?, ?, ?, ?)
          `, [
            generateUUID(),
            clienteId,
            prepagoMonto,
            ventaId,
            createdBy,
            now,
            JSON.stringify({ venta_id: ventaId, codigo, concepto: `Pago venta ${codigo}` })
          ]);
        }
      }

      // 2. Determinar estado inicial (2: en servicio si tiene habitación y tiempo, 1: completado)
      const estado = (validated.habitacion_id && validated.tiempo > 0) ? 2 : 1;

      // 3. Persistencia de la venta (vía Repository)
      logger.debug('[SaleService] Insertando venta - propina:', validated.propina, 'total:', validated.total);
      await SaleRepository.rawInsert(trx, {
        id_venta: ventaId,
        codigo,
        cliente_id: clienteId,
        pedido_id: pedidoId,
        habitacion_id: validated.habitacion_id,
        metodo_pago: validated.metodo_pago,
        propina: validated.propina,
        sub_total: validated.sub_total,
        total: validated.total,
        total_comision: totalComision,
        tiempo: validated.tiempo,
        caja_id: cajaId,
        created_by: createdBy,
        estado,
        fecha_crea: now,
        pagos_mixtos: validated.pagos_mixtos ? JSON.stringify(validated.pagos_mixtos) : null
      });

      // 2b. Actualizar estado de habitación a ocupada si la venta tiene habitación y tiempo
      if (validated.habitacion_id && estado === 2) {
        await trx('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [validated.habitacion_id]);
      }

      // 4. Gestión de Anfitrionas y Conflictos
      if (validated.usuarios?.length) {
        const hostessRows = await trx<any[]>(
          `SELECT DISTINCT u.id_usuario
           FROM usuarios u
           INNER JOIN roles r ON r.id_rol = u.rol_id
           INNER JOIN logins l ON l.usuario_id = u.id_usuario
           WHERE u.id_usuario IN (${validated.usuarios.map(() => '?').join(', ')})
             AND u.estado = 1
             AND l.estado = 1
             AND l.en_local = 1
             AND LOWER(r.nombre) = 'anfitriona'`,
          validated.usuarios
        );
        const hostessIds = hostessRows.map((row: any) => row.id_usuario);

        if (hostessIds.length !== validated.usuarios.length) {
          throw new Error('Hay anfitrionas seleccionadas que no estan logueadas en el local');
        }
        if (estado === 2) {
          await RoomManager.pauseConflictingServices(trx, hostessIds, undefined, ventaId);
        }

        for (const uId of hostessIds) {
          await SaleRepository.insertUserRelation(trx, ventaId, uId);
        }
        
        await RoomManager.updateHostessServiceStatus(trx, hostessIds, undefined, ventaId);
      }

      // 5. Detalles y Comisiones (Lógica de Desglose)
        for (const d of validated.detalles) {
          const requestedHostesses = (d.hostesses && d.hostesses.length > 0)
            ? d.hostesses
            : (d.hostess_id ? [d.hostess_id] : []);

          let hostesses = requestedHostesses;
          if (requestedHostesses.length > 0) {
            const hostessRows = await trx<any[]>(
              `SELECT DISTINCT u.id_usuario
               FROM usuarios u
               INNER JOIN roles r ON r.id_rol = u.rol_id
               INNER JOIN logins l ON l.usuario_id = u.id_usuario
               WHERE u.id_usuario IN (${requestedHostesses.map(() => '?').join(', ')})
                 AND u.estado = 1
                 AND l.estado = 1
                 AND l.en_local = 1
                 AND LOWER(r.nombre) = 'anfitriona'`,
              requestedHostesses
            );

            hostesses = hostessRows.map((row: any) => row.id_usuario);
            if (hostesses.length !== requestedHostesses.length) {
              throw new Error('Hay anfitrionas seleccionadas que no estan logueadas en el local');
            }
          }

          if (hostesses.length === 0) {
            hostesses = [null];
          }

          const numAnfs = hostesses.length;
          const totalComm = Math.round(d.comision || 0);
          const commBase = Math.floor(totalComm / numAnfs);
          const remainder = totalComm % numAnfs;

          for (let i = 0; i < numAnfs; i++) {
            const hostessId = hostesses[i];
            const commPart = commBase + (i === 0 ? remainder : 0);
            const qtyPart = (i === 0) ? d.cantidad : 0;
            const subPart = (i === 0) ? (d.sub_total || (d.precio * d.cantidad)) : 0;

            await SaleRepository.insertDetail(trx, {
              id_detalle_venta: generateUUID(),
              venta_id: ventaId,
              producto_id: d.producto_id,
              precio: d.precio,
              comision: commPart,
              cantidad: qtyPart,
              sub_total: subPart,
              hostess_id: hostessId,
              fecha_crea: now
            });

            // Registro de comisiones usando el repositorio especializado
            if (hostessId && commPart > 0) {
              await CommissionRepository.createWithDetail(trx, {
                venta_id: ventaId,
                usuario_id: hostessId,
                monto: commPart
              });
            }
          }
        }

      // 6. Actualización de Caja
      if (cajaId) {
        if (esMixto) {
          const deltas = pagosMixtos.reduce(
            (acc: { efectivo: number; tarjeta: number; transferencia: number }, pago: MixedPayment) => {
              if (pago.metodo === 'efectivo') acc.efectivo += pago.monto;
              if (pago.metodo === 'tarjeta') acc.tarjeta += pago.monto;
              if (pago.metodo === 'transferencia') acc.transferencia += pago.monto;
              return acc;
            },
            { efectivo: 0, tarjeta: 0, transferencia: 0 }
          );

          await CashRegisterRepository.updateBalances(trx, cajaId, {
            venta: validated.total - validated.propina,
            propina: validated.propina,
            efectivo: deltas.efectivo,
            tarjeta: deltas.tarjeta,
            transferencia: deltas.transferencia,
            prepago: prepagoMonto,
            comision: totalComision
          });
        } else {
          const montoMetodoPrincipal = Number(validated.total) - prepagoMonto;
          await CashRegisterRepository.updateBalances(trx, cajaId, {
            venta: validated.total - validated.propina,
            propina: validated.propina,
            efectivo: validated.metodo_pago === 'efectivo' ? montoMetodoPrincipal : 0,
            tarjeta: validated.metodo_pago === 'tarjeta' ? montoMetodoPrincipal : 0,
            transferencia: validated.metodo_pago === 'transferencia' ? montoMetodoPrincipal : 0,
            prepago: prepagoMonto,
            comision: totalComision
          });
        }
      }

      // 7. Auditoría de negocio
      await AuditRepository.log({
        user_id: createdBy,
        action: 'CREATE_SALE',
        resource_type: 'sales',
        resource_id: ventaId,
        details: { total: validated.total, metodo_pago: validated.metodo_pago, codigo }
      }, trx);

      // 8. Actualizar estado del pedido a procesado (estado = 0)
      if (pedidoId) {
        logger.debug('[SaleService] Actualizando pedido:', pedidoId, 'a estado 0');
        await trx('UPDATE pedidos SET estado = 0 WHERE id_pedido = ?', [pedidoId]);
        logger.debug('[SaleService] Pedido actualizado a estado 0');
      }

      // 7b. Registrar propina si existe
      if (validated.propina && validated.propina > 0) {
        logger.debug('[SaleService] Registrando propina:', validated.propina);
        try {
          const pedidoUsuarios = pedidoId
            ? await trx<any[]>('SELECT mesero_id FROM pedidos WHERE id_pedido = ? LIMIT 1', [pedidoId])
            : [];
          const destinatariosPropina = Array.from(
            new Set(
              [createdBy].concat(
                pedidoUsuarios[0]?.mesero_id ? [String(pedidoUsuarios[0].mesero_id)] : []
              )
            )
          );

          await TipRepository.register({
            venta_id: ventaId,
            monto: validated.propina,
            usuario_ids: destinatariosPropina
          });
          logger.info('[SaleService] Propina registrada correctamente');
        } catch (tipError) {
          logger.error('[SaleService] Error al registrar propina:', tipError);
        }
      }

      return { id: ventaId, codigo, total: validated.total };
    });

    // Notificar a todos los clientes SSE para que actualicen los timers activos
    sendNotificationToAll('timers_updated', { timestamp: now });

    return result;
  }
}
