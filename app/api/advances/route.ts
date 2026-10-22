import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarAnticipos, solicitarAnticipo } from '@/modules/personal';
import { isAdministrator } from '@/lib/middleware/auth';

export const GET = withRoute(
  { auth: true, audit: true, module: 'advances', action: 'read' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const estado =
      searchParams.get('estado') !== null ? Number(searchParams.get('estado')) : undefined;
    const usuario_id = searchParams.get('usuario_id') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
    const offset = Number(searchParams.get('offset') ?? 0);

    const { data, total } = await listarAnticipos({
      estado,
      usuario_id,
      startDate,
      endDate,
      limit,
      offset
    });
    return NextResponse.json({ success: true, data, total, limit, offset });
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'advances', action: 'write' },
  async (request: Request, { user }) => {
    const body = await request.json();
    const { action, usuario_id } = body;

    if (action === 'solicitar') {
      const id = await solicitarAnticipo(user.id.toString(), body);
      return NextResponse.json(
        { success: true, message: 'Solicitud enviada', anticipo_id: id },
        { status: 201 }
      );
    }

    if (!isAdministrator(user)) {
      return NextResponse.json(
        { success: false, message: 'Solo puedes solicitar tu propio anticipo desde Mis anticipos' },
        { status: 403 }
      );
    }
    if (!usuario_id) {
      return NextResponse.json(
        { success: false, message: 'Selecciona un usuario' },
        { status: 400 }
      );
    }
    const result = await solicitarAnticipo(
      String(usuario_id),
      { ...body, monto: Number(body.monto) },
      user.id.toString()
    );
    return NextResponse.json(
      {
        success: true,
        message: 'Solicitud creada. Debe aprobarse antes de que el cajero entregue el efectivo.',
        data: result
      },
      { status: 201 }
    );
  }
);
