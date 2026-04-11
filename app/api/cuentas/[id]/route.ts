import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';

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

export const PUT = withAppAuth(
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const body = await request.json();
    const cuentaActualizada = await CuentaRepository.updateCuenta(id, body, user.id);
    return NextResponse.json({
      success: true,
      message: 'Cuenta actualizada correctamente',
      data: cuentaActualizada
    });
  }
);

export const DELETE = withAppAuth(
  async (_request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    await CuentaRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Cuenta eliminada exitosamente' });
  }
);
