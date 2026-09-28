import { CuentaCreateSchema } from '@/lib/business/schemas';
import {
  buildCuentaSalePayload,
  esMetodoPagoVenta,
  type CuentaSaleDetalleRow,
  type CuentaSalePayload,
  type CuentaSaleRow
} from '@/lib/business/cuentaSale';
import { withTransaction, type TransactionQuery } from '@/lib/database/db';
import { BusinessError, NotFoundError } from '@/lib/errors/errors';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import type { CuentaUpdateBody, CuentaCobrarBody } from '@/lib/repositories/CuentaRepository';
import { SaleService } from '@/lib/services/SaleService';
import { z } from 'zod';

type AccountCreateInput = z.input<typeof CuentaCreateSchema>;

export class AccountService {
  static async create(body: AccountCreateInput, createdBy: string) {
    const validated = CuentaCreateSchema.parse(body);
    return await CuentaRepository.create(validated, createdBy);
  }

  /** @deprecated Usar create() */
  static async createAccountMovement(body: AccountCreateInput, createdBy: string) {
    return await AccountService.create(body, createdBy);
  }

  static async getAll(tipo?: string, estado?: string) {
    return await CuentaRepository.getAll(tipo, estado);
  }

  static async getById(id: string) {
    return await CuentaRepository.getById(id);
  }

  static async updateCuenta(id: string, body: CuentaUpdateBody, createdBy: string) {
    return await CuentaRepository.updateCuenta(id, body, createdBy);
  }

  static async cobrar(id: string, body: CuentaCobrarBody, cobradoPor: string) {
    return await CuentaRepository.cobrar(id, body, cobradoPor);
  }

  /**
   * Cierra la cuenta y registra la venta de lo consumido en UNA sola
   * transacción.
   *
   * Antes eran dos requests (`POST /cuentas/:id/cobrar` y `POST /sales`) que el
   * servidor no ejecutaba atómicamente: si se cortaba en medio quedaba una
   * cuenta cobrada sin venta. Los dos pasos ahora comparten `trx`, así que
   * confirman juntos o revierten juntos, y la app puede encolar esto como una
   * única intención para cobrar sin red.
   */
  static async cobrarConVenta(id: string, body: CuentaCobrarBody, usuarioId: string) {
    const notificaciones: Array<() => void | Promise<void>> = [];
    const aplazar = (tarea: () => void | Promise<void>) => notificaciones.push(tarea);

    await withTransaction(async trx => {
      // 1) El cobro valida primero (cuenta abierta, caja abierta, saldo
      //    prepago): si algo falla, no se factura nada.
      await CuentaRepository.cobrarEnTransaccion(trx, id, body, usuarioId, aplazar);

      // 2) La venta se arma con las MISMAS filas que se cobraron.
      const payload = await AccountService.armarVentaDeLaCuenta(trx, id, body);
      await SaleService.createSale(payload, usuarioId, { trx, onAfterCommit: aplazar });
    });

    for (const tarea of notificaciones) await tarea();

    return await AccountService.getById(id);
  }

  /**
   * Lee la cuenta y sus líneas con el mismo `trx` con el que se factura, y arma
   * el payload de la venta.
   */
  private static async armarVentaDeLaCuenta(
    trx: TransactionQuery,
    id: string,
    body: CuentaCobrarBody
  ): Promise<CuentaSalePayload> {
    const [cuenta] = await trx<Array<CuentaSaleRow & { total: number }>>(
      'SELECT codigo, cliente_id, pedido_id, sub_total, total, total_comision FROM cuentas WHERE id_cuenta = ?',
      [id]
    );
    if (!cuenta) throw new NotFoundError('Cuenta', id);

    const detalles = await trx<CuentaSaleDetalleRow[]>(
      `SELECT producto_id, precio, cantidad, sub_total, comision, hostess_id
         FROM detalle_cuentas
        WHERE cuenta_id = ?
        ORDER BY fecha_crea ASC`,
      [id]
    );

    // Una cuenta sin líneas no puede facturarse (`SaleCreateSchema` exige al
    // menos un detalle). Se corta acá, dentro de la misma transacción: si el
    // cobro ya se había aplicado, se revierte en vez de dejar la cuenta cerrada
    // y sin venta.
    if (detalles.length === 0) {
      throw new BusinessError('La cuenta no tiene productos para facturar', 'CUENTA_SIN_DETALLES');
    }

    const usuarios = await trx<Array<{ usuario_id: string | null }>>(
      'SELECT usuario_id FROM cuentas_usuarios WHERE cuenta_id = ? ORDER BY fecha_crea ASC',
      [id]
    );

    const metodoPago = body.tipoPago ?? body.metodoPago ?? body.metodo_pago ?? 'efectivo';
    if (!esMetodoPagoVenta(metodoPago)) {
      // Rechazo determinista (4xx): la cola lo archiva como rechazada con este
      // motivo en vez de reintentar algo que daría lo mismo, y como todo corre
      // en la misma transacción, no se cobra nada a medias.
      throw new BusinessError(`Método de pago no válido: ${metodoPago}`, 'METODO_PAGO_INVALIDO');
    }

    return buildCuentaSalePayload({
      cuenta,
      cobro: {
        montoFinal: Number(body.montoFinal ?? body.total_cobrado ?? cuenta.total ?? 0),
        propinaFinal: Number(body.propinaFinal ?? body.propina ?? 0),
        metodoPago,
        deviceDate: body.device_date
      },
      detalles,
      usuarios: usuarios.map(fila => fila.usuario_id)
    });
  }

  static async stopTimer(id: string, userId: string) {
    return await CuentaRepository.stopTimer(id, userId);
  }

  static async finalizeRoomSession(id: string, nowStr?: string) {
    return await CuentaRepository.finalizeRoomSession(id, nowStr);
  }

  static async requestAnulacion(
    id: string,
    reason: string,
    requestedBy: string,
    requestedAmount: number
  ) {
    return await CuentaRepository.requestAnulacion(id, reason, requestedBy, requestedAmount);
  }

  static async delete(id: string) {
    return await CuentaRepository.delete(id);
  }
}
