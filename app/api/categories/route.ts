import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { CategoryService } from '@/lib/services/CategoryService';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withAppApiWrapper(async () => {
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

export const POST = withAppAuth(async (request: Request) => {
  const { name, description } = await request.json();
  if (!name) throw new ValidationError('Nombre requerido');

  const data = await CategoryService.create(name, description);
  return NextResponse.json(
    { success: true, message: 'Categoría creada correctamente', data },
    { status: 201 }
  );
});

export const PATCH = withAppAuth(async (request: Request) => {
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
    if (!Array.isArray(categories)) throw new ValidationError('Se requiere un array de categorías');
    await CategoryService.reorder(categories);
    return NextResponse.json({ success: true, message: 'Orden actualizado correctamente' });
  }

  throw new ValidationError('Acción no válida');
});

export const PUT = withAppAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const { name, description } = await request.json();

  if (!id || !name) throw new ValidationError('ID y nombre son requeridos', { id, name });

  const data = await CategoryService.update(id, name, description);
  return NextResponse.json({ success: true, message: 'Categoría actualizada correctamente', data });
});

export const DELETE = withAppAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) throw new ValidationError('Falta el id');

  await CategoryService.delete(id);
  return NextResponse.json({
    success: true,
    message: 'Categoría y productos asociados eliminados correctamente'
  });
});
