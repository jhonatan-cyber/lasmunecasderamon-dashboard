import { NextResponse } from 'next/server';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    if (!id || id === 'undefined') return NextResponse.json({ success: false, message: 'ID de usuario es requerido' }, { status: 400 });

    const data = await CommissionRepository.getDetails(id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener detalles', error: error.message }, { status: 500 });
  }
}
