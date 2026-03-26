import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await CuentaRepository.getById(id);
    if (!data)
      return NextResponse.json(
        { success: false, message: 'Cuenta no encontrada' },
        { status: 404 }
      );
    return NextResponse.json(data);
  }
);

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const body = await request.json();
    const createdBy = user.id;

    await CuentaRepository.updateCuenta(id, body, createdBy);
    return NextResponse.json({ success: true, message: 'Cuenta actualizada correctamente' });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    await CuentaRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Cuenta eliminada exitosamente' });
  }
);
