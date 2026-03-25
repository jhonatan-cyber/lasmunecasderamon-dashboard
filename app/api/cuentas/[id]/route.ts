import { NextResponse } from 'next/server';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const data = await CuentaRepository.getById(id);
    if (!data) return NextResponse.json({ success: false, message: 'Cuenta no encontrada' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener la cuenta', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const body = await request.json();
    const createdBy = user.id;

    await CuentaRepository.update(id, body, createdBy);
    return NextResponse.json({ success: true, message: 'Cuenta actualizada correctamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al actualizar la cuenta', error: error.message }, { status: 500 });
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
    await CuentaRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Cuenta eliminada exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al eliminar la cuenta', error: error.message }, { status: 500 });
  }
}
