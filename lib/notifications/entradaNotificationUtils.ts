import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/modules/comunicaciones';
import { logger } from '@/lib/utils/logger';
import { buildEntradaPushBody } from './notificationMessages';

/**
 * Avisos de las entradas de clientes.
 *
 * La puerta cobra en la app del garzón o desde el dashboard, y la bebida se
 * entrega en la barra: el aviso en vivo (SSE) mantiene las colas al día y el
 * push despierta a caja, barra y administración cuando la app está en segundo
 * plano. Nada de esto puede hacer fallar la petición: el registro ya está
 * confirmado cuando se emite.
 */

export type EntradaRegistradaAviso = {
  id: string;
  grupoRegistroId: string | null;
  clienteNombre: string | null;
  cantidad: number;
  montoEntrada: number;
  montoTotal: number;
  metodoPago: string;
  hora: string;
  registradoPorNombre: string;
};

export type EntradaActualizadaAviso = {
  entradaId: string;
  accion: 'entregada' | 'anulada';
  clienteNombre: string | null;
  tipo?: 'cortesia' | 'upgrade';
  montoCobrarBarra?: number;
  entregadaPorNombre?: string;
};

export function notificarEntradaRegistrada(entrada: EntradaRegistradaAviso): void {
  try {
    sendNotificationToAll('entrada_registrada', {
      id: entrada.id,
      grupo_registro_id: entrada.grupoRegistroId,
      cliente_nombre: entrada.clienteNombre,
      cantidad: entrada.cantidad,
      monto_entrada: entrada.montoEntrada,
      monto_total: entrada.montoTotal,
      metodo_pago: entrada.metodoPago,
      hora: entrada.hora,
      registrado_por_nombre: entrada.registradoPorNombre,
      timestamp: getNowInBusinessTimezone()
    });
  } catch (error) {
    logger.captureException(error, { context: 'entradas:sse:registrada' });
  }

  const body = buildEntradaPushBody({
    cantidad: entrada.cantidad,
    clienteNombre: entrada.clienteNombre,
    total: entrada.montoTotal
  });
  for (const rol of ['cajero', 'barman', 'administrador'] as const) {
    void sendPushByRole(rol, 'Nueva entrada en la puerta', body, {
      type: 'entrada_registrada',
      entradaId: entrada.id,
      grupo_registro_id: entrada.grupoRegistroId
    });
  }
}

export function notificarEntradaActualizada(aviso: EntradaActualizadaAviso): void {
  try {
    sendNotificationToAll('entrada_actualizada', {
      entradaId: aviso.entradaId,
      accion: aviso.accion,
      cliente_nombre: aviso.clienteNombre,
      tipo: aviso.tipo ?? null,
      monto_cobrar_barra: aviso.montoCobrarBarra ?? 0,
      entregada_por_nombre: aviso.entregadaPorNombre ?? null,
      timestamp: getNowInBusinessTimezone()
    });
  } catch (error) {
    logger.captureException(error, { context: 'entradas:sse:actualizada' });
  }
}
