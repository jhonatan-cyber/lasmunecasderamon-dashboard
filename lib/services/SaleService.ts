import { generateUUID, withTransaction, query, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { SaleCreateSchema } from '@/lib/business/schemas';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';
import { AuditRepository } from '@/lib/repositories/AuditRepository';
import { TipRepository } from '@/lib/repositories/TipRepository';
import { RoomManager } from '@/lib/services/RoomManager';
import { SecurityAlertService } from '@/lib/services/SecurityAlertService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { invalidateDashboardCache } from '@/lib/cache/dashboardCache';
import { logger } from '@/lib/utils/logger';
import { BusinessError } from '@/lib/errors/errors';
import { NotFoundError } from '@/lib/errors/errors';
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

      let esLibreIngreso = false;
      if (validated.habitacion_id) {
        const roomRows = await trx<any[]>(
          'SELECT precio, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
          [validated.habitacion_id]
        );
        if (roomRows.length > 0) {
          const roomPrice = Number(roomRows[0].precio || 0);
          const roomCommission = Number(roomRows[0].comision_anfitriona || 0);
          esLibreIngreso = roomPrice <= 0 || roomCommission <= 0;
        }
      }

      const estado = validated.habitacion_id && validated.tiempo > 0 && !esLibreIngreso ? 2 : 1;

      // === INSERT VENTA PRINCIPAL ===
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

      // === OPTIMIZACIÓN: Validar TODAS las hostesses en UNA query ===
      // Extraer todos los IDs únicos de hostesses desde usuarios principales + detalles
      const allRequestedHostessIds = [
        ...new Set(
          [
            ...(validated.usuarios || []),
            ...validated.detalles.flatMap(d => {
              const ids = d.hostesses?.length ? d.hostesses : d.hostess_id ? [d.hostess_id] : [];
              return ids;
            })
          ].filter(Boolean)
        )
      ] as string[];

      let validatedHostessIds: string[] = [];
      if (allRequestedHostessIds.length > 0) {
        const hostessRows = await trx<any[]>(
          `SELECT DISTINCT u.id_usuario
           FROM usuarios u
           INNER JOIN roles r ON r.id_rol = u.rol_id
           INNER JOIN logins l ON l.usuario_id = u.id_usuario
           WHERE u.id_usuario IN (${allRequestedHostessIds.map(() => '?').join(', ')})
             AND u.estado = 1
             AND l.estado = 1
             AND l.en_local = 1
             AND LOWER(r.nombre) = 'anfitriona'`,
          allRequestedHostessIds
        );
        validatedHostessIds = hostessRows.map((row: { id_usuario: string }) => row.id_usuario);

        if (validatedHostessIds.length !== allRequestedHostessIds.length) {
          throw new BusinessError(
            'Hay anfitrionas seleccionadas que no estan logueadas en el local',
            'HOSTESS_NOT_LOGGED_IN'
          );
        }
      }

      const validatedHostessSet = new Set(validatedHostessIds);

      // === VALIDACIÓN DE USUARIOS PRINCIPALES + RELACIONES ===
      if (validated.usuarios?.length) {
        const mainHostessIds = validated.usuarios.filter((id: string) =>
          validatedHostessSet.has(id)
        );

        if (estado === 2) {
          await RoomManager.pauseConflictingServices(trx, mainHostessIds, undefined, ventaId);
        }

        // BATCH INSERT ventas_usuarios
        await SaleService.batchInsertUserRelations(trx, ventaId, mainHostessIds, now);

        await RoomManager.updateHostessServiceStatus(trx, mainHostessIds, undefined, ventaId);
      }

      // === OPTIMIZACIÓN: BATCH INSERTS para detalles y comisiones ===
      const detailRows: Array<Record<string, unknown>> = [];
      const commissionMainRows: Array<Record<string, unknown>> = [];
      const commissionDetailRows: Array<Record<string, unknown>> = [];

      for (const d of validated.detalles) {
        const requestedHostesses = d.hostesses?.length
          ? d.hostesses
          : d.hostess_id
            ? [d.hostess_id]
            : [];
        const hostesses =
          requestedHostesses.length > 0
            ? requestedHostesses.filter((id: string) => validatedHostessSet.has(id))
            : [];

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
            const qtyPart = i === hostessCount - 1 ? remainingQty : baseQty === 0 ? 1 : baseQty;
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

          const detailId = generateUUID();
          detailRows.push({
            id_detalle_venta: detailId,
            venta_id: ventaId,
            producto_id: d.producto_id,
            precio: d.precio,
            comision: commPart,
            cantidad: qtyPart,
            sub_total: subPart,
            hostess_id: hostessId,
            fecha_crea: now
          });

          if (hostessId && commPart > 0) {
            const commissionId = generateUUID();
            commissionMainRows.push({
              id_comision: commissionId,
              venta_id: ventaId,
              usuario_id: hostessId,
              monto: commPart,
              estado: 1,
              fecha_crea: now
            });
            commissionDetailRows.push({
              id_detalle_comision: generateUUID(),
              comision_id: commissionId,
              usuario_id: hostessId,
              comision: commPart,
              estado: 1,
              fecha_crea: now
            });
          }
        }
      }

      // BATCH INSERT detalles
      if (detailRows.length > 0) {
        await SaleService.batchInsertDetails(trx, detailRows);
      }

      // BATCH INSERT comisiones + detalle_comisiones
      if (commissionMainRows.length > 0) {
        await SaleService.batchInsertCommissions(trx, commissionMainRows, commissionDetailRows);
      }

      // === ACTUALIZACIÓN CAJA ===
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

      // === AUDITORÍA ===
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

      if (pedidoId) {
        await trx('UPDATE pedidos SET estado = 0 WHERE id_pedido = ?', [pedidoId]);
      }

      // === PROPI NAS ===
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
          logger.info(
            `[SaleService] Propina de ${validated.propina} registrada para venta ${ventaId}`
          );
        } catch (tipError: any) {
          logger.error('[SaleService] Error al registrar propina:', tipError?.message || tipError);
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

    // SSE notification (no bloquea — broadcast es síncrono en memoria)
    sendNotificationToAll('timers_updated', { timestamp: now });

    // Invalidar caché del dashboard para que los datos frescos se reflejen
    invalidateDashboardCache({ userId: createdBy });

    return result;
  }

  // ================================================================
  // OPTIMIZACIÓN: Batch inserts para reducir queries N+1
  // ================================================================

  /**
   * Batch insert para detalle_ventas. Reemplaza N inserts individuales
   * por un solo INSERT multi-row.
   */
  private static async batchInsertDetails(
    trx: TransactionQuery,
    rows: Array<Record<string, unknown>>
  ): Promise<void> {
    const columns = [
      'id_detalle_venta',
      'venta_id',
      'producto_id',
      'precio',
      'comision',
      'cantidad',
      'sub_total',
      'hostess_id',
      'fecha_crea'
    ];
    const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = rows.flatMap(row => columns.map(col => row[col]));

    await trx(`INSERT INTO detalle_ventas (${columns.join(', ')}) VALUES ${placeholders}`, values);
  }

  /**
   * Batch insert para comisiones + detalle_comisiones.
   * Inserta ambas tablas en un solo batch cada una.
   */
  private static async batchInsertCommissions(
    trx: TransactionQuery,
    mainRows: Array<Record<string, unknown>>,
    detailRows: Array<Record<string, unknown>>
  ): Promise<void> {
    if (mainRows.length === 0) return;

    // Batch insert comisiones
    const mainColumns = ['id_comision', 'venta_id', 'monto', 'estado', 'fecha_crea'];
    const mainPlaceholders = mainRows
      .map(() => `(${mainColumns.map(() => '?').join(', ')})`)
      .join(', ');
    const mainValues = mainRows.flatMap(row => mainColumns.map(col => row[col]));

    await trx(
      `INSERT INTO comisiones (${mainColumns.join(', ')}) VALUES ${mainPlaceholders}`,
      mainValues
    );

    // Batch insert detalle_comisiones
    const detailCols = [
      'id_detalle_comision',
      'comision_id',
      'usuario_id',
      'comision',
      'estado',
      'fecha_crea'
    ];
    const detailPlaceholders = detailRows
      .map(() => `(${detailCols.map(() => '?').join(', ')})`)
      .join(', ');
    const detailValues = detailRows.flatMap(row => detailCols.map(col => row[col]));

    await trx(
      `INSERT INTO detalle_comisiones (${detailCols.join(', ')}) VALUES ${detailPlaceholders}`,
      detailValues
    );
  }

  /**
   * Batch insert para ventas_usuarios. Reemplaza N inserts individuales
   * por un solo INSERT multi-row.
   */
  private static async batchInsertUserRelations(
    trx: TransactionQuery,
    ventaId: string,
    usuarioIds: string[],
    now: string
  ): Promise<void> {
    if (usuarioIds.length === 0) return;

    const columns = ['id_usuario_venta', 'venta_id', 'usuario_id', 'fecha_crea'];
    const rows = usuarioIds.map(usuarioId => [generateUUID(), ventaId, usuarioId, now]);
    const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = rows.flat();

    await trx(`INSERT INTO ventas_usuarios (${columns.join(', ')}) VALUES ${placeholders}`, values);
  }

  static async approveAnulacion(ventaId: string, approvedBy: string, requestedAmount: number) {
    return await SaleRepository.approveAnulacion(ventaId, approvedBy, requestedAmount);
  }

  static async getAll(params: Record<string, string | undefined>) {
    return await SaleRepository.getAll(params as any);
  }

  static async getById(id: string | number) {
    return await SaleRepository.getById(id.toString());
  }

  static async updateStatus(id: string, estado: number, userId?: string) {
    return await SaleRepository.updateStatus(id, estado, userId);
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: string) {
    const result = await SaleRepository.processAnulacion(requestId, approvedBy, status);
    // 🔒 Verificar anulaciones masivas
    try {
      const saleInfo = await query<any[]>(
        `SELECT v.codigo, v.total FROM ventas v
         INNER JOIN solicitudes_anulacion_ventas sav ON sav.venta_id = v.id_venta
         WHERE sav.id = ? LIMIT 1`,
        [requestId]
      );
      if (saleInfo.length > 0) {
        SecurityAlertService.checkMassAnulation({
          entityType: 'venta',
          entityId: requestId,
          entityCode: saleInfo[0].codigo,
          userId: approvedBy,
          totalAmount: Number(saleInfo[0].total || 0)
        }).catch(() => {});
      }
    } catch {}
    return result;
  }

  static async requestAnulacion(id: string, motivo: string, userId: string, monto: number) {
    return await SaleRepository.requestAnulacion(id, motivo, userId, monto);
  }
}
