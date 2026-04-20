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
import { BusinessError } from '@/lib/errors/errors';
import { z } from 'zod';
import {
  parsePagosMixtos,
  validatePagosMixtos,
  calcularDeltasCaja,
  procesarPrepago,
  type MixedPayment
} from '@/lib/business/pagosMixtos';

type SaleCreateInput = z.input<typeof SaleCreateSchema> & {
  skip_client_prepago?: boolean;
  origen?: string;
  id_pedido?: string;
};

export class SaleService {
  static async createSale(body: SaleCreateInput, createdBy: string) {
    const validated = SaleCreateSchema.parse(body);
    const skipClientPrepago = Boolean(body?.skip_client_prepago || body?.origen === 'cuenta');
    const skipCashRegisterPosting = body?.origen === 'cuenta';

    const pedidoId = validated.pedido_id || body.pedido_id || body.id_pedido;
    const clienteId = validated.cliente_id || body.cliente_id;

    const ventaId = generateUUID();
    const codigo = validated.codigo || Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = getNowInBusinessTimezone(validated.device_date);
    const pagosMixtos: MixedPayment[] = parsePagosMixtos(validated.pagos_mixtos);

    const cajaId = await CashRegisterRepository.getCurrentCajaId();
    const totalComisionCalculada = validated.detalles.reduce(
      (sum, detalle) => sum + Number(detalle.comision || 0),
      0
    );
    const totalComision =
      Number(validated.total_comision || 0) > 0
        ? Number(validated.total_comision || 0)
        : totalComisionCalculada;

    const result = await withTransaction(async trx => {
      let prepagoMonto = 0;
      const esMixto = validated.metodo_pago === 'mixto';
      const prepagoSolicitado = esMixto
        ? pagosMixtos
            .filter((pago: MixedPayment) => pago.metodo === 'prepago')
            .reduce((sum: number, pago: MixedPayment) => sum + pago.monto, 0)
        : null;

      if (esMixto) {
        validatePagosMixtos(pagosMixtos, Number(validated.total || 0));
      }

      if (clienteId && !skipClientPrepago) {
        prepagoMonto = await procesarPrepago(trx, {
          clienteId,
          total: Number(validated.total || 0),
          prepagoSolicitado,
          ventaId,
          createdBy,
          now,
          codigo,
          concepto: `Pago venta ${codigo}`
        });
      }

      const estado = validated.habitacion_id && validated.tiempo > 0 ? 2 : 1;

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

      if (validated.habitacion_id && estado === 2) {
        await trx('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [
          validated.habitacion_id
        ]);
      }
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
          throw new BusinessError(
            'Hay anfitrionas seleccionadas que no estan logueadas en el local',
            'HOSTESS_NOT_LOGGED_IN'
          );
        }
        if (estado === 2) {
          await RoomManager.pauseConflictingServices(trx, hostessIds, undefined, ventaId);
        }

        for (const uId of hostessIds) {
          await SaleRepository.insertUserRelation(trx, ventaId, uId);
        }

        await RoomManager.updateHostessServiceStatus(trx, hostessIds, undefined, ventaId);
      }

      for (const d of validated.detalles) {
        const requestedHostesses =
          d.hostesses && d.hostesses.length > 0 ? d.hostesses : d.hostess_id ? [d.hostess_id] : [];

        let hostesses: (string | null)[] = requestedHostesses;
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
            throw new BusinessError(
              'Hay anfitrionas seleccionadas que no estan logueadas en el local',
              'HOSTESS_NOT_LOGGED_IN'
            );
          }
        }

        const totalComm = Math.round(d.comision || 0);
        const totalQty = Math.max(1, Number(d.cantidad || 1));
        const isChampagne = Boolean(d.isChampagne);
        const effectiveHostesses =
          hostesses.length === 0 ? [null] : isChampagne ? hostesses : hostesses.slice(0, totalQty);
        const hostessCount = Math.max(1, effectiveHostesses.length);

        const commissionByIndex = new Array(hostessCount).fill(0);
        const quantityByIndex = new Array(hostessCount).fill(0);
        const subtotalByIndex = new Array(hostessCount).fill(0);

        if (isChampagne) {
          const commBase = Math.floor(totalComm / hostessCount);
          const remainder = totalComm % hostessCount;

          for (let i = 0; i < hostessCount; i++) {
            commissionByIndex[i] = commBase + (i === 0 ? remainder : 0);
            quantityByIndex[i] = i === 0 ? totalQty : 0;
            subtotalByIndex[i] = i === 0 ? d.sub_total || d.precio * totalQty : 0;
          }
        } else {
          const unitBaseCommission = Math.floor(totalComm / totalQty);
          let remainingCommissionRemainder = totalComm % totalQty;
          const baseQty = Math.floor(totalQty / hostessCount);
          let remainingQty = totalQty;

          for (let i = 0; i < hostessCount; i++) {
            const qtyPart =
              i === hostessCount - 1
                ? remainingQty
                : baseQty === 0
                  ? 1
                  : baseQty;

            remainingQty -= qtyPart;
            quantityByIndex[i] = qtyPart;
            subtotalByIndex[i] = d.precio * qtyPart;

            let commPart = unitBaseCommission * qtyPart;
            const remainderForThisHostess = Math.min(remainingCommissionRemainder, qtyPart);
            commPart += remainderForThisHostess;
            remainingCommissionRemainder -= remainderForThisHostess;
            commissionByIndex[i] = commPart;
          }
        }

        for (let i = 0; i < hostessCount; i++) {
          const hostessId = effectiveHostesses[i];
          const commPart = commissionByIndex[i];
          const qtyPart = quantityByIndex[i];
          const subPart = subtotalByIndex[i];

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
      if (cajaId && !skipCashRegisterPosting) {
        if (esMixto) {
          const deltas = calcularDeltasCaja(pagosMixtos);

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
      await AuditRepository.log(
        {
          user_id: createdBy,
          action: 'CREATE_SALE',
          resource_type: 'sales',
          resource_id: ventaId,
          details: { total: validated.total, metodo_pago: validated.metodo_pago, codigo }
        },
        trx
      );

      // 8. Actualizar estado del pedido a procesado (estado = 0)
      if (pedidoId) {
        await trx('UPDATE pedidos SET estado = 0 WHERE id_pedido = ?', [pedidoId]);
      }

      // 7b. Registrar propina si existe
      if (validated.propina && validated.propina > 0) {
        try {
          const pedidoUsuarios = pedidoId
            ? await trx<any[]>('SELECT mesero_id FROM pedidos WHERE id_pedido = ? LIMIT 1', [
                pedidoId
              ])
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
        } catch (tipError) {
          logger.error('[SaleService] Error al registrar propina:', tipError);
        }
      }

      return {
        id_venta: ventaId,
        id: ventaId,
        codigo,
        total: validated.total,
        estado,
        fecha_crea: now
      };
    });

    // Notificar a todos los clientes SSE para que actualicen los timers activos
    sendNotificationToAll('timers_updated', { timestamp: now });

    return result;
  }
}
