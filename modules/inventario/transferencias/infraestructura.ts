/**
 * Casos de uso de transferencias — API pública de servidor del módulo inventario.
 *
 * Cada operación acepta un `ContextoOperacion` opaco (§6): con contexto escribe en
 * la transacción que abrió el flujo que lo llamó; sin contexto abre su propia
 * unidad y, sólo después de confirmar, emite `transfers_updated` — notificar
 * dentro haría que una operación revertida dejara un refresco fantasma en las
 * sesiones (§6, efectos posteriores al commit).
 */
import { withTransaction } from '@/lib/database/db';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByPermission } from '@/modules/comunicaciones';
import { TRANSFER_RESOLVE_PERMISSION } from '@/lib/constants/transferPermissions';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import type { TraspasoInput, TraspasoResultado } from '../contracts';
import {
  aceptarTransferencia as aceptarEnRepositorio,
  listarTransferencias,
  rechazarTransferencia as rechazarEnRepositorio,
  traspasarAlBar as traspasarEnRepositorio
} from './repositorio';

export { listarTransferencias };

export async function traspasarAlBar(
  input: TraspasoInput,
  contexto?: ContextoOperacion
): Promise<TraspasoResultado> {
  if (contexto) return await traspasarEnRepositorio(resolverTransaccion(contexto), input);
  let resultado: TraspasoResultado = { trasladadas: 0, stock_bar: 0 };
  await withTransaction(async trx => {
    resultado = await traspasarEnRepositorio(trx, input);
  });
  // Sólo después del commit: el módulo Transferencias se refresca en vivo.
  sendNotificationToAll('transfers_updated', {
    action: 'created',
    id: resultado.transferencia_id,
    producto_id: input.producto_id,
    presentacion_id: input.presentacion_id,
    cantidad: resultado.trasladadas
  });
  // Aviso a quien puede aprobarlo según el permiso (no según el nombre del rol):
  // el mismo par que gobierna los botones de Aprobar en la UI.
  void sendPushByPermission(
    TRANSFER_RESOLVE_PERMISSION.module,
    TRANSFER_RESOLVE_PERMISSION.action,
    'Nuevo traspaso pendiente',
    `${resultado.trasladadas} unidad(es) esperan aprobación en el bar.`,
    { type: 'transfer_created', id: resultado.transferencia_id }
  );
  return resultado;
}

export async function aceptarTransferencia(
  id: string,
  usuarioId: string,
  contexto?: ContextoOperacion
): Promise<void> {
  if (contexto) {
    await aceptarEnRepositorio(resolverTransaccion(contexto), id, usuarioId);
    return;
  }
  await withTransaction(async trx => {
    await aceptarEnRepositorio(trx, id, usuarioId);
  });
  sendNotificationToAll('transfers_updated', { action: 'accepted', id });
}

export async function rechazarTransferencia(
  id: string,
  usuarioId: string,
  contexto?: ContextoOperacion
): Promise<void> {
  if (contexto) {
    await rechazarEnRepositorio(resolverTransaccion(contexto), id, usuarioId);
    return;
  }
  await withTransaction(async trx => {
    await rechazarEnRepositorio(trx, id, usuarioId);
  });
  sendNotificationToAll('transfers_updated', { action: 'rejected', id });
}
