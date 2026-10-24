'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useGenericFetch } from '@/hooks/shared';
import { imprimirComprobantesPrepago } from '@/components/shared/printComprobantePrepago';
import { construirComprobantesDeConsumo } from '@/lib/business/comprobantePrepago';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import type { Client } from '@/types/client';
import type { NuevoClienteQuincho, ReservaQuincho, ReservaQuinchoDraft } from '@/types/quincho';

const RESERVAS_ENDPOINT = '/api/quinchos';
const CLIENTES_ENDPOINT = '/api/clients?limit=200';

type RespuestaApi = {
  success?: boolean;
  message?: string;
  error?: { message?: string };
  data?: unknown;
};

function mensajeDeError(payload: RespuestaApi, fallback: string): string {
  return payload?.error?.message || payload?.message || fallback;
}

async function enviarJson(url: string, metodo: 'POST' | 'DELETE', body?: unknown) {
  const response = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => ({}))) as RespuestaApi;
  return { response, payload };
}

/**
 * Datos y mutaciones de la pantalla de reservas de quincho. El alta puede crear
 * el cliente en el momento: primero se crea la ficha y después la reserva, que
 * acredita el total al prepago de ese cliente.
 */
export function useQuinchos() {
  const {
    data: reservas,
    isLoading,
    error,
    refetch: refetchReservas
  } = useGenericFetch<ReservaQuincho>(RESERVAS_ENDPOINT, {
    transform: (result: RespuestaApi) => (result.success ? (result.data as ReservaQuincho[]) : [])
  });

  const { data: clientes, refetch: refetchClientes } = useGenericFetch<Client>(CLIENTES_ENDPOINT, {
    transform: (result: RespuestaApi) =>
      (Array.isArray(result.data) ? result.data : []).map((cliente: Record<string, unknown>) => ({
        id: cliente.id as string,
        run: String(cliente.run ?? ''),
        name: String(cliente.name ?? ''),
        lastName: String(cliente.lastName ?? ''),
        phone: String(cliente.phone ?? ''),
        saldo: Number(cliente.saldo ?? 0)
      }))
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const crearCliente = useCallback(async (datos: NuevoClienteQuincho) => {
    const { response, payload } = await enviarJson('/api/clients', 'POST', {
      name: datos.name.trim(),
      lastName: datos.lastName.trim(),
      run: datos.run?.trim() ?? '',
      phone: datos.phone?.trim() ?? ''
    });
    if (!response.ok || !payload.success) {
      throw new Error(mensajeDeError(payload, 'No se pudo crear el cliente'));
    }
    const cliente = payload.data as { id: string } | undefined;
    if (!cliente?.id) throw new Error('No se pudo crear el cliente');
    return cliente.id;
  }, []);

  const crearReserva = useCallback(
    async (draft: ReservaQuinchoDraft) => {
      setIsSaving(true);
      try {
        const clienteId = draft.cliente_nuevo
          ? await crearCliente(draft.cliente_nuevo)
          : draft.cliente_id;

        if (!clienteId) throw new Error('Selecciona o crea un cliente');

        const { response, payload } = await enviarJson(RESERVAS_ENDPOINT, 'POST', {
          cliente_id: clienteId,
          fecha_reserva: draft.fecha_reserva,
          cantidad_personas: draft.cantidad_personas,
          monto_por_persona: draft.monto_por_persona,
          metodo_pago: draft.metodo_pago,
          observaciones: draft.observaciones?.trim() || undefined
        });

        if (!response.ok || !payload.success) {
          throw new Error(mensajeDeError(payload, 'No se pudo registrar la reserva'));
        }

        const reserva = payload.data as ReservaQuincho | undefined;
        if (reserva) {
          const saldoAnterior = Number(
            clientes?.find(c => String(c.id) === String(reserva.cliente_id))?.saldo ?? 0
          );
          imprimirComprobantesPrepago(
            construirComprobantesDeConsumo({
              destinos: [{ cliente_id: reserva.cliente_id, monto: reserva.total }],
              clientes: [
                {
                  id: reserva.cliente_id,
                  nombre: `${reserva.cliente_nombre} ${reserva.cliente_apellido}`.trim(),
                  run: reserva.cliente_run ?? null,
                  saldo: saldoAnterior
                }
              ],
              base: {
                movimiento: 'carga',
                titulo: 'Reserva de quincho',
                fecha: new Date().toLocaleString('es-CL'),
                lineas: [
                  {
                    concepto: 'Reserva de quincho',
                    detalle: `${reserva.fecha_reserva} · ${reserva.cantidad_personas} personas × ${formatCurrencyCLP(reserva.monto_por_persona)}`,
                    monto: reserva.total
                  }
                ],
                total: reserva.total,
                nota: 'El total de la reserva se acreditó al saldo prepago del cliente.'
              }
            })
          );
        }

        toast.success(payload.message || 'Reserva registrada y saldo cargado al cliente');
        await Promise.all([refetchReservas(), refetchClientes()]);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo registrar la reserva');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [clientes, crearCliente, refetchClientes, refetchReservas]
  );

  const anularReserva = useCallback(
    async (reserva: ReservaQuincho) => {
      setIsCancelling(true);
      try {
        const { response, payload } = await enviarJson(
          `${RESERVAS_ENDPOINT}/${encodeURIComponent(reserva.id)}`,
          'DELETE'
        );
        if (!response.ok || !payload.success) {
          throw new Error(mensajeDeError(payload, 'No se pudo anular la reserva'));
        }
        toast.success(payload.message || 'Reserva anulada y saldo devuelto');
        await Promise.all([refetchReservas(), refetchClientes()]);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo anular la reserva');
        return false;
      } finally {
        setIsCancelling(false);
      }
    },
    [refetchClientes, refetchReservas]
  );

  return {
    reservas: reservas ?? [],
    clientes: clientes ?? [],
    isLoading,
    error,
    isSaving,
    isCancelling,
    crearReserva,
    anularReserva
  };
}
