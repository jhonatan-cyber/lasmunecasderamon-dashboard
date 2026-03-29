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

export class SaleService {
  /**
   * Procesa la creación de una venta, incluyendo deducción de prepago,
   * gestión de conflictos de habitación/anfitrionas y actualización de caja.
   */
  static async createSale(body: any, createdBy: string) {
    console.log('[SaleService] createSale - body:', JSON.stringify(body));
    const validated = SaleCreateSchema.parse(body);
    console.log('[SaleService] validated:', JSON.stringify(validated));
    
    // Usar el body original si validated no tiene pedido_id
    const pedidoId = validated.pedido_id || body.pedido_id || body.id_pedido;
    const clienteId = validated.cliente_id || body.cliente_id;
    
    console.log('[SaleService] pedidoId:', pedidoId, 'clienteId:', clienteId);
    
    const ventaId = generateUUID();
    const codigo = validated.codigo || Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = getNowInBusinessTimezone(validated.device_date);

    const cajaId = await CashRegisterRepository.getCurrentCajaId();

    const result = await withTransaction(async (trx) => {
      // 1. Deducción de Prepago (Usa método del repositorio)
      const montoPrepago = validated.monto_prepago || 0;
      if (montoPrepago > 0 && clienteId) {
        const client = await ClientRepository.getByIdForUpdate(trx, clienteId);
        
        if (!client || (client.saldo || 0) < montoPrepago) {
          throw new Error('Saldo insuficiente en cuenta de prepago');
        }
        
        await ClientRepository.updateBalance(trx, clienteId, -montoPrepago);
      }

      // 2. Determinar estado inicial (2: en servicio si tiene habitación y tiempo, 1: completado)
      const estado = (validated.habitacion_id && validated.tiempo > 0) ? 2 : 1;

      // 3. Persistencia de la venta (vía Repository)
      console.log('[SaleService] Insertando venta - propina:', validated.propina, 'total:', validated.total);
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
        total_comision: validated.total_comision,
        tiempo: validated.tiempo,
        caja_id: cajaId,
        created_by: createdBy,
        estado,
        fecha_crea: now
      });

      // 4. Gestión de Anfitrionas y Conflictos
      if (validated.usuarios?.length) {
        if (estado === 2) {
          await RoomManager.pauseConflictingServices(trx, validated.usuarios, undefined, ventaId);
        }

        for (const uId of validated.usuarios) {
          await SaleRepository.insertUserRelation(trx, ventaId, uId);
        }
        
        await RoomManager.updateHostessServiceStatus(trx, validated.usuarios, undefined, ventaId);
      }

      // 5. Detalles y Comisiones (Lógica de Desglose)
        for (const d of validated.detalles) {
          const hostesses = (d.hostesses && d.hostesses.length > 0) ? d.hostesses : (d.hostess_id ? [d.hostess_id] : [null]);
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
        await CashRegisterRepository.updateBalances(trx, cajaId, {
          venta: validated.total - validated.propina,
          propina: validated.propina,
          efectivo: validated.metodo_pago === 'efectivo' ? validated.total : 0,
          tarjeta: validated.metodo_pago === 'tarjeta' ? validated.total : 0,
          transferencia: validated.metodo_pago === 'transferencia' ? validated.total : 0,
          prepago: validated.metodo_pago === 'prepago' ? validated.total : 0,
          comision: validated.total_comision || 0
        });
      }

      // 7. Auditoría de negocio
      await AuditRepository.log({
        user_id: createdBy,
        action: 'CREATE_SALE',
        resource_type: 'sales',
        resource_id: ventaId,
        details: { total: validated.total, metodo_pago: validated.metodo_pago, codigo }
      }, trx);

      // 7b. Registrar propina si existe
      if (validated.propina && validated.propina > 0) {
        console.log('[SaleService] Registrando propina:', validated.propina);
        try {
          await TipRepository.register({
            venta_id: ventaId,
            monto: validated.propina
          });
          console.log('[SaleService] Propina registrada correctamente');
        } catch (tipError) {
          console.error('[SaleService] Error al registrar propina:', tipError);
        }
      }

      // 8. Actualizar estado del pedido a procesado (estado = 0)
      console.log('[SaleService] Actualizando pedido:', pedidoId, 'a estado 0');
      if (pedidoId) {
        const result = await trx('UPDATE pedidos SET estado = 0, fecha_mod = ? WHERE id_pedido = ?', [now, pedidoId]);
        console.log('[SaleService] Resultado update pedido:', result);
      }

      // 9. Registrar movimiento en historial de prepago
      if (montoPrepago > 0 && clienteId) {
        await trx(`
          INSERT INTO clientes_prepago_movimientos 
          (id_movimiento, cliente_id, tipo, monto, metodo_pago, usuario_id, fecha_crea, metadatos)
          VALUES (?, ?, 'consumo', ?, 'prepago', ?, ?, ?)
        `, [
          generateUUID(),
          clienteId,
          montoPrepago,
          createdBy,
          now,
          JSON.stringify({ venta_id: ventaId, pedido_id: pedidoId, codigo })
        ]);
      }

      return { id: ventaId, codigo, total: validated.total };
    });

    return result;
  }
}
