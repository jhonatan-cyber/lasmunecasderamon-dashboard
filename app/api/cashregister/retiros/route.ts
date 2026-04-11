import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { WithdrawalService } from '@/lib/services/WithdrawalService';
import { jsonWithNormalizedDates } from '@/lib/api/date-response';

export const GET = withAppAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id_caja = searchParams.get('id_caja');

    if (!id_caja)
      return NextResponse.json(
        { success: false, message: 'id_caja es requerido' },
        { status: 400 }
      );

    const retiros = await WithdrawalService.getByCajaId(id_caja);
    return jsonWithNormalizedDates({ success: true, data: retiros });
  },
  { requiredPermission: { module: 'finances', action: 'read' } }
);

export const POST = withAppAuth(
  async (request: Request) => {
    const body = await request.json();
    const result = await WithdrawalService.addRetiro(body);
    return NextResponse.json({ success: true, ...result });
  },
  { requiredPermission: { module: 'finances', action: 'write' } }
);
