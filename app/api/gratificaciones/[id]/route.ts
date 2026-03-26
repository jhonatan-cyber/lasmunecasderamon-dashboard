import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const { monto, descripcion } = await request.json();
    if (!id || !monto)
      return NextResponse.json(
        { success: false, message: 'ID y monto son requeridos' },
        { status: 400 }
      );

    await GratificacionRepository.update(id, { monto, descripcion });
    return NextResponse.json({ success: true, message: 'Gratificación actualizada' });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    if (!id)
      return NextResponse.json({ success: false, message: 'ID es requerido' }, { status: 400 });

    await GratificacionRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Gratificación eliminada' });
  }
);
