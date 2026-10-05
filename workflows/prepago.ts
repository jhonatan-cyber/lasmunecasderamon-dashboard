import 'server-only';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { registrarRecargaEnUnidad, devolverSaldoEnUnidad } from '@/modules/clientes';
import type { EntradaRecargaPrepago, EntradaDevolucionSaldo } from '@/modules/clientes/contracts';
import { obtenerCajaActiva, registrarMovimientoCobro } from '@/modules/caja';
import { crearCuentaPrepagoRecarga, cerrarCuentasPrepagoSaldadas } from '@/modules/operacion';
import { BusinessError } from '@/lib/errors/errors';

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
