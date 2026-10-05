import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { CategoryService } from '@/modules/inventario';
import { ValidationError } from '@/lib/errors/errors';

// Las mutaciones de categorías se guardan con el módulo `categories`, no con
// `products`: son operaciones de la categoría y el catálogo tiene su propia familia
// de permisos (`categories.create/edit/activate/deactivate`). Con el guard anterior
// (`products.write`) el botón «Editar» de la UI aparecía para quien tuviera
// `categories.edit` y la API le respondía 403.
export const GET = withPublicRoute(async () => {
  const data = await CategoryService.getAll();
  return NextResponse.json(
    { success: true, data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59'
      }
    }
  );
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'categories', action: 'write' },
  async (request: Request) => {
    const { name, description } = await request.json();
    if (!name) throw new ValidationError('Nombre requerido');

    const data = await CategoryService.create(name, description);
    return NextResponse.json(
      { success: true, message: 'Categoría creada correctamente', data },
      { status: 201 }
    );
  }
);

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'categories', action: 'write' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const action = searchParams.get('action');
      if (!action) throw new ValidationError('Acción no válida');

      const updated = await CategoryService.updateStatus(id, action);
      return NextResponse.json({
        success: true,
        message: `Categoría ${action === 'activate' ? 'activada' : 'desactivada'} correctamente`,
        category: updated
      });
    }

    const body = await request.json();
    const { categories, action } = body;
    if (action === 'reorder') {
      if (!Array.isArray(categories))
        throw new ValidationError('Se requiere un array de categorías');
      await CategoryService.reorder(categories);
      return NextResponse.json({ success: true, message: 'Orden actualizado correctamente' });
    }

    throw new ValidationError('Acción no válida');
  }
);

export const PUT = withRoute(
  { auth: true, audit: true, module: 'categories', action: 'write' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { name, description } = await request.json();

    if (!id || !name) throw new ValidationError('ID y nombre son requeridos', { id, name });

    const data = await CategoryService.update(id, name, description);
    return NextResponse.json({
      success: true,
      message: 'Categoría actualizada correctamente',
      data
    });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'categories', action: 'delete' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new ValidationError('Falta el id');

    await CategoryService.delete(id);
    return NextResponse.json({
      success: true,
      message: 'Categoría y productos asociados eliminados correctamente'
    });
  }
);
