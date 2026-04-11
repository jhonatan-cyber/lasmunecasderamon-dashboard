import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await CashRegisterRepository.getById(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Caja no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withAppAuth(
  async (_request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    await CashRegisterRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Caja eliminada' });
  },
  { requiredPermission: { module: 'finances', action: 'delete' } }
);
