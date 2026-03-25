import { NextResponse } from 'next/server';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const data = await CashRegisterRepository.getById(id);
    if (!data) return NextResponse.json({ success: false, message: 'Caja no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener la caja', error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    await CashRegisterRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Caja eliminada' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al eliminar caja', error: error.message }, { status: 500 });
  }
}
