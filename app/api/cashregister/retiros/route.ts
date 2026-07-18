import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { WithdrawalService } from '@/lib/services/WithdrawalService';
import { jsonWithNormalizedDates } from '@/lib/api/date-response';
import { RetiroCajaSchema } from '@/lib/business/schemas/withdrawal';
import { validateOrResponse } from '@/lib/api/validate';

export const GET = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'read' },
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
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request) => {
    const body = await request.json();
    const validated = validateOrResponse(RetiroCajaSchema, body);
    if (validated instanceof NextResponse) return validated;
    const result = await WithdrawalService.addRetiro(validated);
    return NextResponse.json({ success: true, ...result });
  }
);
