import { NextResponse } from 'next/server';
import { UserRepository } from '@/lib/repositories/UserRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const data = await UserRepository.getById(id);
    if (!data) return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, user: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener usuario', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();
    await UserRepository.update(id, body);
    return NextResponse.json({ success: true, message: 'Usuario actualizado' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al actualizar usuario', error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    await UserRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Usuario eliminado' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al eliminar usuario', error: error.message }, { status: 500 });
  }
}
