import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';
import { getAnticipoBalances } from '@/lib/business/anticiposUtils';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const balances = await getAnticipoBalances(user.id.toString());

  return NextResponse.json({
    success: true,
    data: {
      monto_asistencia: balances.montoAsistencia,
      monto_comisiones: balances.montoComision,
      monto_propinas: balances.montoPropina,
      monto_maximo: balances.montoMaximo
    }
  });
});
