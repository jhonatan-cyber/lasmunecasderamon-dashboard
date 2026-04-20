import { NextResponse } from 'next/server';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import { ApiResponse } from '@/lib/api/api-response';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return ApiResponse.validationError('Token de solicitud no válido');
    }

    const solicitud = await GratificacionRepository.getSolicitudDetalle(token);
    return NextResponse.json({ success: true, solicitud });
  } catch (error) {
    return ApiResponse.error(error);
  }
}
