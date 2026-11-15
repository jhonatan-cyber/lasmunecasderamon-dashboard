import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { getAnticipoBalances, tieneSolicitudPendiente } from '@/modules/personal';
import { obtenerEfectivoEnCaja } from '@/modules/caja';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const balances = await getAnticipoBalances(user.id.toString());

    const pendiente = await tieneSolicitudPendiente(user.id.toString());

    // Obtener el efectivo disponible en caja
    const efectivoEnCaja = await obtenerEfectivoEnCaja();

    return NextResponse.json({
      success: true,
      data: {
        monto_asistencia: balances.montoAsistencia,
        monto_comisiones: balances.montoComision,
        monto_propinas: balances.montoPropina,
        monto_maximo: balances.montoMaximo,
        tiene_solicitud_pendiente: pendiente,
        efectivo_en_caja: efectivoEnCaja
      }
    });
  }
);
