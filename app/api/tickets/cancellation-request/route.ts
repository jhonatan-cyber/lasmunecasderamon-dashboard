import { NextResponse } from 'next/server';
import { obtenerSolicitudAnulacionEntradaPorToken } from '@/modules/entradas';
import { ValidationError } from '@/lib/errors/errors';

/**
 * Retorna los datos de una solicitud de anulación de entrada por token.
 *
 * La usa la página de confirmación para mostrar los detalles antes de
 * que el administrador apruebe o rechace.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Token de solicitud no válido' },
      { status: 400 }
    );
  }

  const solicitud = await obtenerSolicitudAnulacionEntradaPorToken(token);
  if (!solicitud) {
    return NextResponse.json(
      { success: false, message: 'Solicitud no encontrada o ya procesada' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, solicitud });
}
