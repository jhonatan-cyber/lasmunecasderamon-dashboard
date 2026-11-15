import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { getAnticipoBalances, tieneSolicitudPendiente } from '@/modules/personal';
import { obtenerCajaActiva } from '@/modules/caja';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const balances = await getAnticipoBalances(user.id.toString());

    const pendiente = await tieneSolicitudPendiente(user.id.toString());

    // Obtener el efectivo disponible en caja
    let efectivoEnCaja = 0;
    try {
      const idCaja = await obtenerCajaActiva();
      if (idCaja) {
        const { query } = await import('@/lib/database/db');
        const cajaRows = await query<any[]>(
          'SELECT monto_apertura, efectivo FROM cajas WHERE id_caja = ? AND estado = 1',
          [idCaja]
        );
        if (cajaRows.length > 0) {
          efectivoEnCaja = Number(cajaRows[0].monto_apertura || 0) + Number(cajaRows[0].efectivo || 0);
        }
      }
    } catch {
      // Si no se puede obtener la caja, dejar en 0
      efectivoEnCaja = 0;
    }

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
