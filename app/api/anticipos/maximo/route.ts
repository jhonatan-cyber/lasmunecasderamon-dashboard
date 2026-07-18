import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { getAnticipoBalances } from '@/lib/business/anticiposUtils';
import { query } from '@/lib/database/db';

export const GET = withRoute({ auth: true, audit: true }, async (_request: Request, { user }: { params: any; user: any }) => {
  const balances = await getAnticipoBalances(user.id.toString());

  const pendingCheck = await query<any[]>(
    'SELECT COUNT(*) as count FROM anticipos WHERE usuario_id = ? AND estado = 2',
    [user.id.toString()]
  );
  const tieneSolicitudPendiente = Number(pendingCheck[0]?.count || 0) > 0;

  return NextResponse.json({
    success: true,
    data: {
      monto_asistencia: balances.montoAsistencia,
      monto_comisiones: balances.montoComision,
      monto_propinas: balances.montoPropina,
      monto_maximo: balances.montoMaximo,
      tiene_solicitud_pendiente: tieneSolicitudPendiente
    }
  });
});
