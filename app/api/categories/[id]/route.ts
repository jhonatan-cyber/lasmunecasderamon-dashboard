import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CategoryRepository } from '@/lib/repositories/CategoryRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const { name, description } = await request.json();

    if (!id || !name)
      return NextResponse.json(
        { success: false, message: 'ID y nombre son requeridos' },
        { status: 400 }
      );

    await CategoryRepository.update(id, name, description);
    return NextResponse.json({ success: true, message: 'Categoría actualizada correctamente' });
  }
);

export const PATCH = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!id || !action)
      return NextResponse.json(
        { success: false, message: 'Faltan parámetros id o action' },
        { status: 400 }
      );

    const updatedCategory = await CategoryRepository.updateStatus(id, action);
    return NextResponse.json({
      success: true,
      message: `Categoría ${action === 'activate' ? 'activada' : 'desactivada'} correctamente`,
      category: updatedCategory
    });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

    await CategoryRepository.delete(id);
    return NextResponse.json({
      success: true,
      message: 'Categoría y productos asociados eliminados correctamente'
    });
  }
);
