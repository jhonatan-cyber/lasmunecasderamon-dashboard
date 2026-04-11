import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { getAnticipoBalances } from '@/lib/business/anticiposUtils';

export const dynamic = 'force-dynamic';

export const GET = withAppAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');

    if (!usuario_id) {
      return NextResponse.json(
        { success: false, message: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    try {
      const balances = await getAnticipoBalances(usuario_id);
      return NextResponse.json({
        success: true,
        data: balances
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al obtener saldos';
      return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
  },
  { module: 'advances', action: 'read' }
);
