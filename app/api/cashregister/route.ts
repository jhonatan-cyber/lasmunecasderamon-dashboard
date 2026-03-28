import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { CashRegisterService } from '@/lib/services/CashRegisterService';

export const GET = withAppAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const resumen = searchParams.get('resumen');

    if (resumen === '1') {
      const data = await CashRegisterRepository.summary();
      return NextResponse.json({ success: true, data });
    }

    const data = await CashRegisterRepository.getAll();
    return NextResponse.json({ success: true, data });
  },
  { module: 'finances', action: 'read' }
);

export const POST = withAppAuth(
  async (request: Request) => {
    const body = await request.json();
    const id = await CashRegisterService.openCaja(body);
    return NextResponse.json({ success: true, message: 'Caja abierta', id }, { status: 201 });
  },
  { module: 'finances', action: 'write' }
);

export const PUT = withAppAuth(
  async (request: Request) => {
    const body = await request.json();
    const { id_caja, ...data } = body;
    if (!id_caja) return NextResponse.json({ success: false, message: 'ID requerido' }, { status: 400 });

    await CashRegisterService.updateCaja(id_caja, data);
    return NextResponse.json({ success: true, message: 'Caja actualizada' });
  },
  { module: 'finances', action: 'write' }
);

export const PATCH = withAppAuth(
  async (request: Request) => {
    const body = await request.json();
    await CashRegisterService.closeCaja(body);
    return NextResponse.json({ success: true, message: 'Caja cerrada exitosamente' });
  },
  { module: 'finances', action: 'write' }
);
