import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await CashRegisterRepository.getById(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Caja no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const userAuth = await getAuth();
    if (!userAuth)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    await CashRegisterRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Caja eliminada' });
  }
);
