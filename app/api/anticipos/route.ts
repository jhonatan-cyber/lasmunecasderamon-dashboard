import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AnticipoService } from '@/lib/services/AnticipoService';
import { logger } from '@/lib/utils/logger';

export const GET = withAppAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const estado =
      searchParams.get('estado') !== null ? Number(searchParams.get('estado')) : undefined;
    const usuario_id = searchParams.get('usuario_id') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
    const offset = Number(searchParams.get('offset') ?? 0);

    const { data, total } = await AnticipoService.getAll({
      estado,
      usuario_id,
      startDate,
      endDate,
      limit,
      offset
    });
    return NextResponse.json({ success: true, data, total, limit, offset });
  },
  { requiredPermission: { module: 'finances', action: 'read' } }
);

export const POST = withAppAuth(
  async (request: Request, { user }) => {
    const body = await request.json();
    const { action, usuario_id, monto, device_date } = body;

    if (action === 'solicitar') {
      const id = await AnticipoService.requestAnticipo(user.id.toString(), body);
      return NextResponse.json(
        { success: true, message: 'Solicitud enviada', anticipo_id: id },
        { status: 201 }
      );
    }

    if (!usuario_id || !monto || isNaN(Number(monto))) {
      return NextResponse.json(
        { success: false, message: 'usuario_id y monto son requeridos' },
        { status: 400 }
      );
    }

    const { motivo } = body;
    try {
      const result = await AnticipoService.grantAnticipo(
        usuario_id,
        Number(monto),
        motivo,
        device_date,
        user.id
      );
      return NextResponse.json(
        { success: true, message: 'Anticipo otorgado correctamente', ...result },
        { status: 201 }
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al otorgar anticipo';
      logger.error('Error granting advance:', { error });
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
  },
  { requiredPermission: { module: 'finances', action: 'write' } }
);
