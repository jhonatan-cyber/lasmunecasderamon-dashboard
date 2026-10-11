import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { isValidIdempotencyKey } from '@/lib/api/idempotency';
import { SyncOperationRepository } from '@/lib/database/sync-operations';

export const GET = withRoute({ auth: true, access: 'authenticated' }, async (request, { user }) => {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!isValidIdempotencyKey(id)) {
    return NextResponse.json(
      { success: false, message: 'Identificador inválido.' },
      { status: 400 }
    );
  }
  const operation = await SyncOperationRepository.get(id);
  // No revela la existencia ni la respuesta de operaciones de otra persona.
  if (!operation || String(operation.usuario_id) !== String(user.id)) {
    return NextResponse.json(
      { success: true, data: { state: 'not_found' } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const stored = SyncOperationRepository.parseResponse(operation);
  return NextResponse.json(
    {
      success: true,
      data: {
        state: operation.estado,
        response: operation.estado === 'aplicada' ? (stored?.body ?? null) : undefined,
        message:
          operation.estado === 'rechazada'
            ? 'La operación fue rechazada por el servidor.'
            : operation.estado === 'fallida'
              ? 'Esta operación requiere revisión; no se reenviará para evitar duplicados.'
              : undefined
      }
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
