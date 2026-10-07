import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { SyncOperationRepository } from '@/lib/database/sync-operations';
import { buildReplayResponse } from '@/lib/api/idempotency';

/** Una clave identifica una intención y un payload, dentro de la identidad del administrador. */
export async function ejecutarUnaVez(
  adminId: string,
  operacionId: string,
  comando: unknown,
  ejecutar: () => Promise<Response>
) {
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const key = hash(`mcp:${adminId}:${operacionId}`);
  const endpoint = `mcp.solicitudes:${hash(JSON.stringify(comando))}`;
  const { claimed, operation } = await SyncOperationRepository.claim(key, {
    endpoint,
    usuarioId: adminId
  });
  if (!claimed) {
    if (!operation || operation.endpoint !== endpoint || operation.usuario_id !== adminId) {
      return NextResponse.json(
        { success: false, message: 'operacion_id ya utilizado con otros datos.' },
        { status: 409 }
      );
    }
    return buildReplayResponse(operation);
  }
  try {
    const response = await ejecutar();
    const body = await response.clone().json();
    await SyncOperationRepository.resolve(
      key,
      response.ok ? 'aplicada' : response.status >= 500 ? 'fallida' : 'rechazada',
      { status: response.status, body }
    );
    return response;
  } catch (error) {
    await SyncOperationRepository.fail(
      key,
      error instanceof Error ? error.message : 'Error de operación MCP'
    );
    throw error;
  }
}
