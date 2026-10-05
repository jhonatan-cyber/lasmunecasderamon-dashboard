import { NextResponse } from 'next/server';
import { listarSolicitudesPendientes, obtenerSolicitudPorToken } from '@/modules/ventas';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const listAll = searchParams.get('list');

  if (listAll === 'true' || (!token && !listAll)) {
    return NextResponse.json({ success: true, solicitudes: await listarSolicitudesPendientes() });
  }

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token invalido' }, { status: 400 });
  }

  const [solicitud] = await obtenerSolicitudPorToken(token);

  if (!solicitud) {
    return NextResponse.json(
      { success: false, message: 'Solicitud no encontrada o ya procesada' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, solicitud });
}
