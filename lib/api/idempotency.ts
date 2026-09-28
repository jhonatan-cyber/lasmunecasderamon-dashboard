import { NextResponse } from 'next/server';
import {
  SyncOperationRepository,
  type SyncOperation
} from '@/lib/repositories/SyncOperationRepository';
import logger from '@/lib/utils/logger';

/**
 * Idempotencia de las operaciones que la app encola sin red.
 *
 * El cliente manda una clave propia (el id de la intención en su cola) en el
 * header `x-idempotency-key`. El servidor la reclama antes de ejecutar:
 *
 *   - primera vez  → ejecuta y guarda la respuesta;
 *   - repetida     → replica la respuesta guardada, sin volver a ejecutar.
 *
 * Así, un pedido que se cortó después de aplicarse no se duplica al reintentar.
 * Sin header, la ruta se comporta exactamente como antes.
 */
export const IDEMPOTENCY_HEADER = 'x-idempotency-key';

/** Claves opacas: sin espacios, entre 8 y 64 caracteres. */
const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,64}$/;

export function isValidIdempotencyKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

/**
 * Lee la clave del header. Devuelve `null` si no vino o si no es válida: en ese
 * caso la operación sigue el camino normal (mejor un comportamiento conocido que
 * una clave basura como clave de deduplicación).
 */
export function readIdempotencyKey(request: Request): string | null {
  const raw = request.headers.get(IDEMPOTENCY_HEADER) ?? request.headers.get('idempotency-key');
  const key = raw?.trim();

  if (!key) return null;

  if (!isValidIdempotencyKey(key)) {
    logger.warn('[idempotency] clave inválida ignorada', { key });
    return null;
  }

  return key;
}

export interface IdempotentConfig {
  /** Operación estable, p. ej. 'orders.create'. */
  endpoint: string;
  usuarioId?: string | null;
  deviceDate?: string;
}

/** Traduce la fila guardada a la respuesta HTTP que hay que replicar. */
export function buildReplayResponse(operation: SyncOperation): Response {
  const headers = { [IDEMPOTENCY_HEADER]: operation.id_cliente, 'x-idempotent-replay': '1' };

  if (operation.estado === 'aplicada' || operation.estado === 'rechazada') {
    const stored = SyncOperationRepository.parseResponse(operation);
    if (stored) {
      return NextResponse.json(stored.body ?? {}, { status: stored.status, headers });
    }
  }

  // Pendiente (en curso u huérfana) o fallida: puede que haya aplicado, así que
  // reintentar en automático es justo lo que duplica. Queda para revisión.
  const message =
    operation.estado === 'pendiente'
      ? 'Esta operación ya está en curso; esperá la respuesta del servidor antes de reintentar.'
      : 'Esta operación quedó en revisión y no se reintenta automáticamente para no duplicarla.';

  return NextResponse.json(
    { success: false, code: `IDEMPOTENCY_${operation.estado.toUpperCase()}`, message },
    { status: 409, headers }
  );
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

/**
 * Envuelve el handler de una ruta con idempotencia. Si el request no trae clave
 * válida, ejecuta el handler tal cual.
 */
export async function runIdempotent(
  request: Request,
  config: IdempotentConfig,
  handler: () => Promise<Response>
): Promise<Response> {
  const key = readIdempotencyKey(request);
  if (!key) return handler();

  const { claimed, operation } = await SyncOperationRepository.claim(key, {
    endpoint: config.endpoint,
    usuarioId: config.usuarioId ?? null,
    deviceDate: config.deviceDate
  });

  if (!claimed && operation) {
    logger.info('[idempotency] reintento: se replica la respuesta guardada', {
      key,
      endpoint: config.endpoint,
      estado: operation.estado
    });
    return buildReplayResponse(operation);
  }

  try {
    const response = await handler();
    const body = await readResponseBody(response);

    // Un 5xx no es determinista (puede haber aplicado a medias): no se marca
    // como "resuelta" para que no se replique como si fuera definitiva.
    const estado = response.ok ? 'aplicada' : response.status >= 500 ? 'fallida' : 'rechazada';
    await SyncOperationRepository.resolve(key, estado, { status: response.status, body });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    await SyncOperationRepository.fail(key, message);
    throw error;
  }
}
