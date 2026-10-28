import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth-app';
import { createSseStream } from '@/lib/api/sseStream';

/**
 * Autentica la sesión y abre el stream de personal.
 *
 * `/api/notifications/sse` y `/api/orders/sse` comparten audiencia (rol e id
 * del usuario) y política de respuesta; mantener el bloque duplicado hacía que
 * un cambio de autenticación tuviera que replicarse en dos rutas.
 */
export async function createStaffSseResponse(request: Request) {
  const user = await getAuth();

  if (!user) {
    return NextResponse.json(
      { success: false, message: 'No autenticado', code: 'NO_TOKEN' },
      { status: 401 }
    );
  }

  return createSseStream(request, {
    channel: 'staff',
    userId: user.id,
    role: user.role
  });
}
