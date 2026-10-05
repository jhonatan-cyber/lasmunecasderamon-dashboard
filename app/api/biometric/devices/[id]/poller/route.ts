import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { setRecolector } from '@/modules/asistencia';

/**
 * Interruptor del recolector de registros de un equipo.
 *
 * La lógica —credenciales completas, conexión exitosa, listener en vivo— vive en el
 * módulo; la ruta sólo traduce el resultado a HTTP.
 */
export const PUT = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json();
    const encender = Boolean(body?.encender);

    const resultado = await setRecolector(id, encender);

    if (!resultado.success) {
      return NextResponse.json(
        { success: false, message: resultado.message },
        { status: resultado.status }
      );
    }

    return NextResponse.json({ success: true, message: resultado.message });
  }
);
