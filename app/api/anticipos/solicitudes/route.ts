import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarSolicitudesDeUsuario, solicitarAnticipoSimple } from '@/modules/personal';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withRoute(
  { auth: true, audit: true, module: 'advances', action: 'read' },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const solicitudes = await listarSolicitudesDeUsuario(user.id.toString());
    return NextResponse.json({ success: true, data: solicitudes });
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'advances', action: 'write' },
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();
    const { monto, motivo } = body;

    if (!monto || !motivo)
      throw new ValidationError('monto y motivo son requeridos', { monto, motivo });

    const result = await solicitarAnticipoSimple(user.id.toString(), Number(monto), motivo);
    return NextResponse.json(
      { success: true, message: 'Solicitud enviada', data: result },
      { status: 201 }
    );
  }
);
