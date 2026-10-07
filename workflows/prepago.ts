import 'server-only';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { registrarRecargaEnUnidad, devolverSaldoEnUnidad } from '@/modules/clientes';
import type { EntradaRecargaPrepago, EntradaDevolucionSaldo } from '@/modules/clientes/contracts';
import { obtenerCajaActiva, registrarMovimientoCobro } from '@/modules/caja';
import { crearCuentaPrepagoRecarga, cerrarCuentasPrepagoSaldadas } from '@/modules/operacion';
import { BusinessError } from '@/lib/errors/errors';
import { reclamarDevolucionSaldo, resolverDevolucionEnUnidad } from '@/modules/clientes';

/** Reclamo, descuento de saldo y resolución se confirman juntos. */
export function resolverSolicitudDevolucion(id: string, accion: 'aprobar' | 'rechazar', adminId: string, montoEsperado: number) {
  return enUnaUnidad(unidad => unidad.ejecutar(async contexto => {
    const solicitud = await reclamarDevolucionSaldo(id, contexto);
    if (Number(solicitud.monto) !== montoEsperado) throw new BusinessError('El monto cambió; consulta el detalle nuevamente');
    if (accion === 'aprobar') {
      const saldado = await devolverSaldoEnUnidad({ cliente_id: solicitud.cliente_id, monto: Number(solicitud.monto), motivo: solicitud.motivo ?? 'Devolución aprobada', usuario_id: adminId }, contexto);
      if (saldado) await cerrarCuentasPrepagoSaldadas(solicitud.cliente_id, contexto);
    }
    const estado = accion === 'aprobar' ? 'aprobada' : 'rechazada';
    await resolverDevolucionEnUnidad(id, estado, adminId, contexto);
    return { id, estado, saldo_descontado: accion === 'aprobar' };
  }));
}

export function cargarPrepago(entrada: EntradaRecargaPrepago): Promise<void> {
  return enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const cajaId = await obtenerCajaActiva(contexto);
      if (!cajaId)
        throw new BusinessError(
          'No hay una caja abierta para registrar la recarga prepago',
          'NO_CAJA_ABIERTA'
        );
      const deltas = await registrarRecargaEnUnidad(entrada, contexto);
      await registrarMovimientoCobro(cajaId, deltas, contexto);
      await crearCuentaPrepagoRecarga(
        entrada.cliente_id,
        entrada.monto,
        entrada.usuario_id || null,
        contexto
      );
    })
  );
}

export function devolverSaldo(entrada: EntradaDevolucionSaldo): Promise<void> {
  return enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const saldado = await devolverSaldoEnUnidad(entrada, contexto);
      if (saldado) await cerrarCuentasPrepagoSaldadas(entrada.cliente_id, contexto);
    })
  );
}
