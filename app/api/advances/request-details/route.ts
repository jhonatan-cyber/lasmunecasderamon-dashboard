import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { obtenerSolicitudAnticipoPorId } from '@/modules/personal';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 400 });
  }

  const result = await obtenerSolicitudAnticipoPorId(token);

  if (result.length === 0) {
    return NextResponse.json(
      { success: false, message: 'Solicitud no encontrada' },
      { status: 404 }
    );
  }

  const sol = result[0];
  if (sol.estado !== 2) {
    return NextResponse.json(
      { success: false, message: 'La solicitud ya fue procesada anteriormente' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    solicitud: {
      id: sol.id_anticipo,
      usuario: sol.usuario,
      nick: sol.nick,
      monto: Number(sol.monto),
      motivo: sol.motivo,
      fecha: sol.fecha_crea
    }
  });
});
