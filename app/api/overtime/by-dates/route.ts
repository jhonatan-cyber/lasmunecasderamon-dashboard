import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarHorasExtrasDeUsuario, listarHorasExtrasPorFechas } from '@/modules/personal';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dates = searchParams.get('dates');

    let result;
    if (dates) {
      result = await listarHorasExtrasPorFechas(user.id.toString(), dates.split(','));
    } else if (startDate && endDate) {
      result = await listarHorasExtrasDeUsuario(user.id.toString(), {
        desde: startDate,
        hasta: endDate
      });
    } else {
      throw new ValidationError('Faltan parámetros de fecha', { startDate, endDate, dates });
    }

    return NextResponse.json({ success: true, data: result });
  }
);
