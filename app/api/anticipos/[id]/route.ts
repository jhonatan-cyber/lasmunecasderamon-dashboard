import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { actualizarEstadoAnticipo, entregarAnticipo, procesarSolicitud } from '@/modules/personal';
import { ValidationError } from '@/lib/errors/errors';

export const PUT = withRoute(
  { auth: true, audit: true, module: 'advances', action: 'process' },
  async (request: Request, context: { params: Promise<{ id: string }>; user: any }) => {
    const { id } = await context.params;
    const { estado, entregado_por } = await request.json();
    const { user } = context;

    if (Number(estado) === 1) {
      await procesarSolicitud(id, 'approve', user.id.toString());
    } else if (Number(estado) === 3) {
      await procesarSolicitud(id, 'reject', user.id.toString());
    } else if (Number(estado) === 0) {
      await entregarAnticipo(id, user.id.toString());
    } else {
      await actualizarEstadoAnticipo(id, Number(estado ?? 0), user.id.toString());
    }

    return NextResponse.json({ success: true, message: 'Anticipo procesado correctamente' });
  }
);
