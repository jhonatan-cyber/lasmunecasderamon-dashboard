import { NextResponse } from 'next/server';
import { ClientService } from '@/lib/services/ClientService';
import { withPublicRoute } from '@/lib/api/withRoute';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('cliente_id');

  if (!clientId) {
    return NextResponse.json(
      { success: false, message: 'El ID del cliente es requerido' },
      { status: 400 }
    );
  }

  const data = await ClientService.getHistory(clientId);
  return NextResponse.json({ success: true, data });
});
