import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth-app';
import { createSseStream } from '@/lib/api/sseStream';

export const dynamic = 'force-dynamic';

/**
 * Stream de eventos del personal. Exige sesión: el rol y el id del usuario se usan para
 * decidir qué eventos le llegan (ver `lib/api/sseEvents.ts`).
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
