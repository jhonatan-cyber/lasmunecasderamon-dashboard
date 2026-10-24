/**
 * Reparto del prepago entre clientes. Lo usan los servicios de habitación y la
 * venta de bar cuando dos clientes cubren el mismo consumo con su saldo.
 */

/** Cliente con cuenta y saldo, ya normalizado para el selector de descuento. */
export interface ClienteConSaldo {
  clienteId: string;
  nombre: string;
  saldo: number;
}

/** Destino del descuento prepago que se envía al backend. */
export interface PrepagoDestino {
  cliente_id: string;
  monto: number;
}

import { BusinessError } from '@/lib/errors/errors';
import { allocateProportionally } from '@/lib/business/ventaRepartos';

/**
 * Destinos explícitos de prepago de una venta, normalizados y validados antes
 * de tocar saldos: descarta montos en cero y rechaza un reparto que supere el
 * total de la venta.
 */
export function normalizarDestinosPrepago(
  destinos: { cliente_id?: unknown; monto?: unknown }[] | undefined,
  total: number
): PrepagoDestino[] {
  const normalizados = (destinos ?? [])
    .map(destino => ({
      cliente_id: String(destino.cliente_id ?? '').trim(),
      monto: Math.round(Number(destino.monto) || 0)
    }))
    .filter(destino => destino.cliente_id && destino.monto > 0);

  const repartido = normalizados.reduce((suma, destino) => suma + destino.monto, 0);
  if (repartido > Math.round(Number(total) || 0)) {
    throw new BusinessError(
      'El prepago repartido entre clientes supera el total de la venta',
      'PREPAGO_EXCEDIDO'
    );
  }

  return normalizados;
}

/**
 * Reparte el monto prepago entre clientes con saldo.
 *  - Cliente único: recibe todo lo posible (min(saldo, monto)).
 *  - Ambos: mitad y mitad estricta — hasta la mitad para cada cliente capada por
 *    su saldo, sin pasarse del monto total; el remanente queda para caja.
 */
export function calcularDistribucionPrepago(
  montoDescontar: number,
  clientesConSaldo: ClienteConSaldo[],
  opcion: 'uno' | 'ambos' | 'ninguno',
  titularId?: string
): { destinos: PrepagoDestino[]; pagadoConSaldo: number; alCaja: number } {
  const candidatos = (
    opcion === 'uno' && titularId
      ? clientesConSaldo.filter(c => c.clienteId === titularId)
      : clientesConSaldo
  ).slice(0, opcion === 'ambos' ? 2 : undefined);

  if (opcion === 'ninguno' || candidatos.length === 0) {
    return { destinos: [], pagadoConSaldo: 0, alCaja: Math.max(0, Math.round(montoDescontar)) };
  }

  let restante = Math.max(0, Math.round(montoDescontar));
  const destinos: PrepagoDestino[] = [];

  if (opcion === 'ambos' && candidatos.length === 2) {
    const mitad = Math.round(restante / 2);
    for (const cliente of candidatos) {
      const monto = Math.min(Math.round(cliente.saldo), mitad, restante);
      if (monto > 0) {
        destinos.push({ cliente_id: cliente.clienteId, monto });
        restante -= monto;
      }
    }
  } else {
    const cliente = candidatos[0];
    const monto = Math.min(Math.round(cliente.saldo), restante);
    if (monto > 0) {
      destinos.push({ cliente_id: cliente.clienteId, monto });
      restante -= monto;
    }
  }

  const pagadoConSaldo = destinos.reduce((sum, d) => sum + d.monto, 0);
  return { destinos, pagadoConSaldo, alCaja: restante };
}

/**
 * Devolución de prepago por anulación, repartida entre los clientes que
 * pagaron la venta. `prepagoMantener` es lo que el cliente conserva consumido
 * tras la anulación; el resto se devuelve proporcional a su consumo.
 */
export function calcularDevolucionesPrepago(
  consumos: { cliente_id: string; monto: number }[],
  prepagoMantener: number
): { cliente_id: string; monto: number }[] {
  const reparto = allocateProportionally(
    consumos.map(consumo => ({ key: consumo.cliente_id, amount: consumo.monto })),
    row => row.amount,
    Math.max(0, Math.round(Number(prepagoMantener) || 0))
  );

  return reparto
    .map(row => ({
      cliente_id: row.key,
      monto: Math.max(0, row.currentAmount - Number(row.nextAmount || 0))
    }))
    .filter(devolucion => devolucion.monto > 0);
}
