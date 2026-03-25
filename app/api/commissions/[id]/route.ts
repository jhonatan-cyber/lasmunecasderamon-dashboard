import { NextResponse } from 'next/server';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();
    await CommissionRepository.update(id, body);
    return NextResponse.json({ success: true, message: 'Comisión actualizada' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al actualizar comisión', error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    await CommissionRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Comisión eliminada' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al eliminar comisión', error: error.message }, { status: 500 });
  }
}
