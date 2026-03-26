import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CategoryRepository } from '@/lib/repositories/CategoryRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  const data = await CategoryRepository.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { name, description } = await request.json();
  if (!name)
    return NextResponse.json({ success: false, message: 'Nombre requerido' }, { status: 400 });

  const data = await CategoryRepository.create(name, description);
  return NextResponse.json(
    { success: true, message: 'Categoría creada correctamente', data },
    { status: 201 }
  );
});

export const PATCH = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Caso 1: Actualización de estado por query params (e.g. ?id=...&action=activate)
  if (id) {
    const action = searchParams.get('action');
    if (!action)
      return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 });

    const updated = await CategoryRepository.updateStatus(id, action);
    return NextResponse.json({
      success: true,
      message: `Categoría ${action === 'activate' ? 'activada' : 'desactivada'} correctamente`,
      category: updated
    });
  }

  // Caso 2: Reordenamiento por body JSON
  const body = await request.json();
  const { categories, action } = body;
  if (action === 'reorder') {
    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { success: false, message: 'Se requiere un array de categorías' },
        { status: 400 }
      );
    }
    await CategoryRepository.reorder(categories);
    return NextResponse.json({ success: true, message: 'Orden actualizado correctamente' });
  }
  return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 });
});

export const PUT = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const { name, description } = await request.json();

  if (!id || !name)
    return NextResponse.json(
      { success: false, message: 'ID y nombre son requeridos' },
      { status: 400 }
    );

  const data = await CategoryRepository.update(id, name, description);
  return NextResponse.json({ success: true, message: 'Categoría actualizada correctamente', data });
});

export const DELETE = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

  await CategoryRepository.delete(id);
  return NextResponse.json({
    success: true,
    message: 'Categoría y productos asociados eliminados correctamente'
  });
});
