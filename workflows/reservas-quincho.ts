import 'server-only';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { BusinessError } from '@/lib/errors/errors';
import {
  registrarRecargaEnUnidad,
  devolverSaldoEnUnidad,
  saldoPrepagoAgotado
} from '@/modules/clientes';
import { obtenerCajaActiva, registrarMovimientoCobro } from '@/modules/caja';
import { crearCuentaPrepagoRecarga, cerrarCuentasPrepagoSaldadas } from '@/modules/operacion';
import {
  crearReservaEnUnidad,
  marcarAnuladaEnUnidad,
  reclamarReserva,
  type ReservaQuincho
} from '@/modules/quinchos';

/**
 * Reserva un quincho y cobra el total en el prepago del cliente.
 *
 * Mismo camino del dinero que una recarga de saldo (workflow `cargarPrepago`):
 * la carga postula caja según el método de pago, suma saldo, deja el movimiento
 * CARGA y abre la cuenta PREP-* del cliente. Todo ocurre en una sola unidad con
 * el alta de la reserva: si el cobro falla, la reserva no queda escrita.
 *
 * Sin caja abierta no se puede registrar el ingreso, así que la reserva se
 * rechaza con el mismo criterio que la recarga.
 */
export function reservarQuincho(entrada: unknown, usuarioId: string): Promise<ReservaQuincho> {
  return enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const cajaId = await obtenerCajaActiva(contexto);
      if (!cajaId) {
        throw new BusinessError(
          'No hay una caja abierta para registrar la reserva de quincho',
          'NO_CAJA_ABIERTA'
        );
      }

      const reserva = await crearReservaEnUnidad(entrada, usuarioId, contexto);

      const deltas = await registrarRecargaEnUnidad(
        {
          cliente_id: reserva.cliente_id,
          monto: reserva.total,
          metodo_pago: reserva.metodo_pago,
          usuario_id: usuarioId,
          metadatos: {
            origen: 'reserva_quincho',
            reserva_id: reserva.id,
            fecha_reserva: reserva.fecha_reserva
          }
        },
        contexto
      );
      await registrarMovimientoCobro(cajaId, deltas, contexto);
      await crearCuentaPrepagoRecarga(reserva.cliente_id, reserva.total, usuarioId, contexto);

      return reserva;
    })
  );
}

/**
 * Anula la reserva y devuelve su total descontándolo del prepago del cliente.
 *
 * Es una devolución de saldo: exige que el cliente todavía tenga ese monto
 * disponible en su prepago (si ya lo consumió, la anulación se rechaza con el
 * detalle del saldo). La reserva queda con estado `anulada` y no se puede
 * volver a anular.
 */
export function anularReservaQuincho(id: string, usuarioId: string): Promise<ReservaQuincho> {
  return enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const reserva = await reclamarReserva(id, contexto);

      await devolverSaldoEnUnidad(
        {
          cliente_id: reserva.cliente_id,
          monto: reserva.total,
          motivo: `Anulación de reserva de quincho del ${reserva.fecha_reserva}`,
          usuario_id: usuarioId
        },
        contexto
      );

      const anulada = await marcarAnuladaEnUnidad(id, usuarioId, contexto);

      if (await saldoPrepagoAgotado(reserva.cliente_id, contexto)) {
        await cerrarCuentasPrepagoSaldadas(reserva.cliente_id, contexto);
      }

      return anulada;
    })
  );
}
