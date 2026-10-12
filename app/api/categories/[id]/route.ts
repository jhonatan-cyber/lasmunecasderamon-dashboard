import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { CategoryService } from '@/modules/inventario';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withRoute(
  { auth: true, module: 'categories', action: 'delete' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    return NextResponse.json({
      success: true,
      data: await CategoryService.deletionPreview((await params).id)
    });
  }
);

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
    const result = await CategoryService.delete(id);
    return NextResponse.json({
      success: true,
      message: result.failedImages
        ? `Categoría y productos eliminados. No se pudieron borrar ${result.failedImages} imágenes; revisa los permisos de archivos.`
        : 'Categoría, productos asociados e imágenes eliminados correctamente'
    });
  }
);
