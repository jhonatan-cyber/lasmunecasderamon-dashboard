import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { procesarSolicitud } from '@/modules/personal';

export const PUT = withRoute(
  { auth: true, audit: true, module: 'advances', action: 'process' },
  async (request: Request) => {
    const body = await request.json();
    const { token, accion } = body;

    if (!token || !accion) {
      return NextResponse.json(
        { success: false, message: 'Token y acción son requeridos' },
        { status: 400 }
      );
    }

    const action = accion === 'aprobar' ? 'approve' : 'reject';

    try {
      await procesarSolicitud(token, action);
      return NextResponse.json({
        success: true,
        message: accion === 'aprobar' ? 'Anticipo aprobado' : 'Anticipo rechazado'
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al procesar solicitud';
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
  }
);
