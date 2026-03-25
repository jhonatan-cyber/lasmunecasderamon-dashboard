import { NextResponse } from 'next/server';
import { CategoryRepository } from '@/lib/repositories/CategoryRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const data = await CategoryRepository.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener categorías', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ success: false, message: 'Nombre requerido' }, { status: 400 });

    const id = await CategoryRepository.create(name, description);
    return NextResponse.json({ success: true, message: 'Categoría creada correctamente', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al crear la categoría', error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { categories, action } = await request.json();
    if (action === 'reorder') {
        if (!Array.isArray(categories)) {
            return NextResponse.json({ success: false, message: 'Se requiere un array de categorías' }, { status: 400 });
        }
        await CategoryRepository.reorder(categories);
        return NextResponse.json({ success: true, message: 'Orden actualizado correctamente' });
    }
    return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al reordenar categorías', error: error.message }, { status: 500 });
  }
}
