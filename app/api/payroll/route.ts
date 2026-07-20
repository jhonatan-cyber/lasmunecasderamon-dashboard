import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { PayrollService } from '@/lib/services/PayrollService';

export const GET = withPublicRoute(async () => {
  const data = await PayrollService.getSummary();
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'payroll', action: 'write' },
  async (request: Request) => {
    const { usuario_id } = await request.json();
    if (!usuario_id)
      return NextResponse.json(
        { success: false, message: 'usuario_id es requerido' },
        { status: 400 }
      );

    await PayrollService.pay(usuario_id, usuario_id);
    return NextResponse.json({ success: true, message: 'Pago procesado correctamente' });
  }
);
