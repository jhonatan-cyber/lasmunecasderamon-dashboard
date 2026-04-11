import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { CategoryRepository } from '@/lib/repositories/CategoryRepository';
import { ValidationError } from '@/lib/errors/errors';

export const PUT = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const { name, description } = await request.json();
    if (!name) throw new ValidationError('Nombre es requerido');

    await CategoryRepository.update(id, name, description);
    return NextResponse.json({ success: true, message: 'Categoría actualizada correctamente' });
  }
);

export const PATCH = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) throw new ValidationError('Falta el parámetro action');

    const updatedCategory = await CategoryRepository.updateStatus(id, action);
    return NextResponse.json({
      success: true,
      message: `Categoría ${action === 'activate' ? 'activada' : 'desactivada'} correctamente`,
      category: updatedCategory
    });
  }
);

export const DELETE = withAppAuth(
  async (_request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    await CategoryRepository.delete(id);
    return NextResponse.json({
      success: true,
      message: 'Categoría y productos asociados eliminados correctamente'
    });
  }
);
