import { NextResponse } from 'next/server';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import { getAuth } from '@/lib/auth-app';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const { monto, descripcion } = await request.json();
    if (!id || !monto) return NextResponse.json({ success: false, message: 'ID y monto son requeridos' }, { status: 400 });

    await GratificacionRepository.update(id, { monto, descripcion });
    return NextResponse.json({ success: true, message: 'Gratificación actualizada' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al actualizar gratificación', error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, message: 'ID es requerido' }, { status: 400 });

    await GratificacionRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Gratificación eliminada' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al eliminar gratificación', error: error.message }, { status: 500 });
  }
}
