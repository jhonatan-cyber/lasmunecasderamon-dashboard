import { NextResponse } from 'next/server';
import {
  obtenerSolicitudAnulacionServicioPorToken,
  registrarSolicitudAnulacionServicio
} from '@/modules/operacion';
import { logger } from '@/lib/utils/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token invalido' }, { status: 400 });
  }

  const [solicitud] = await obtenerSolicitudAnulacionServicioPorToken(token);

  if (!solicitud) {
    return NextResponse.json(
      { success: false, message: 'Solicitud no encontrada o ya procesada' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, solicitud });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { servicioId, motivo } = body;

    if (!servicioId || !motivo) {
      return NextResponse.json(
        { success: false, message: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const token = await registrarSolicitudAnulacionServicio({ servicioId, motivo });

    return NextResponse.json({ success: true, token });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('Error al solicitar anulación:', { error });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
