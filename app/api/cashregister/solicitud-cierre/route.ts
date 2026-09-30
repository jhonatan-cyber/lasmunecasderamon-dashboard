import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { CashRegisterService } from '@/lib/services/CashRegisterService';

/**
 * Carga la solicitud de cierre desde el link del WhatsApp.
 *
 * Pública a propósito: el administrador abre el link desde el teléfono, sin
 * sesión en el dashboard. El token es de un solo uso efectivo —la solicitud
 * deja de estar `pendiente` en cuanto se resuelve— y no expone nada más que el
 * desglose de esa caja.
 */
export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 400 });
  }

  const solicitud = await CashRegisterService.getSolicitudCierreByToken(token);

  if (!solicitud) {
    return NextResponse.json(
      { success: false, message: 'Solicitud no encontrada' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, solicitud });
});
