import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { CategoryService } from '@/modules/inventario';
import { ValidationError } from '@/lib/errors/errors';

// Guard del módulo `categories` (no `products`): la categoría tiene sus propios
// permisos y con `products.write` la UI y la API no coincidían.
export const PUT = withRoute(
  { auth: true, audit: true, module: 'categories', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const { name, description } = await request.json();
    if (!name) throw new ValidationError('Nombre es requerido');

    await CategoryService.update(id, name, description);
    return NextResponse.json({ success: true, message: 'Categoría actualizada correctamente' });
  }
);

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'categories', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) throw new ValidationError('Falta el parámetro action');

    const updatedCategory = await CategoryService.updateStatus(id, action);
    return NextResponse.json({
      success: true,
      message: `Categoría ${action === 'activate' ? 'activada' : 'desactivada'} correctamente`,
      category: updatedCategory
    });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'categories', action: 'delete' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await CategoryService.delete(id);
    return NextResponse.json({
      success: true,
      message: 'Categoría y productos asociados eliminados correctamente'
    });
  }
);
