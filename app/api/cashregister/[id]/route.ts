import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { CashRegisterService } from '@/modules/caja';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await CashRegisterService.getById(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Caja no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'delete' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await CashRegisterService.delete(id);
    return NextResponse.json({ success: true, message: 'Caja eliminada' });
  }
);
