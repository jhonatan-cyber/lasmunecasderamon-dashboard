import { NextResponse } from 'next/server';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import { ApiResponse } from '@/lib/api/api-response';

export async function PUT(request: Request) {
  try {
    const { token, accion } = await request.json();

    if (!token || !accion) {
      return ApiResponse.validationError('Token y acción son requeridos');
    }

    if (accion !== 'aprobar' && accion !== 'rechazar') {
      return ApiResponse.validationError('Acción inválida');
    }

    await GratificacionRepository.processSolicitud(
      token,
      accion === 'aprobar' ? 'approve' : 'reject'
    );

    return NextResponse.json({
      success: true,
      message:
        accion === 'aprobar'
          ? 'Gratificación aprobada exitosamente'
          : 'Gratificación rechazada exitosamente'
    });
  } catch (error) {
    return ApiResponse.error(error);
  }
}
