import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth-app';
import { createSseStream } from '@/lib/api/sseStream';

export const dynamic = 'force-dynamic';

/**
 * Segundo stream del personal (lo consume `hooks/orders/useOrdersSSE`). Comparte el manager
 * y por lo tanto la misma política de audiencia que `/api/notifications/sse`.
 */
export async function GET(request: Request) {
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
