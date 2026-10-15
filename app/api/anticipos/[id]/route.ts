import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { entregarAnticipo, procesarSolicitud } from '@/modules/personal';
import { isAdministrator } from '@/lib/middleware/auth';

export const PUT = withRoute(
  { auth: true, audit: true, module: 'advances', action: 'process' },
  async (request: Request, context: { params: Promise<{ id: string }>; user: any }) => {
    const { id } = await context.params;
    const { estado } = await request.json();
    const { user } = context;

    const approval = estado === 1 || estado === 3;
    const delivery = estado === 0;
    if (!approval && !delivery) {
      return NextResponse.json(
        { success: false, message: 'Estado de anticipo inválido' },
        { status: 400 }
      );
    }
    if (
      (approval && !isAdministrator(user)) ||
      (delivery && !['cajero', 'cajera'].includes(user.role?.toLowerCase()))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: approval
            ? 'Solo el administrador puede aprobar o rechazar anticipos'
            : 'Solo el cajero puede entregar el efectivo de un anticipo aprobado'
        },
        { status: 403 }
      );
    }

    if (Number(estado) === 1) {
      await procesarSolicitud(id, 'approve', user.id.toString());
    } else if (Number(estado) === 3) {
      await procesarSolicitud(id, 'reject', user.id.toString());
    } else if (Number(estado) === 0) {
      await entregarAnticipo(id, user.id.toString());
    }

    return NextResponse.json({ success: true, message: 'Anticipo procesado correctamente' });
  }
);
