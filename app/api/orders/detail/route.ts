import { NextResponse } from 'next/server';
import { OrderRepository } from '@/lib/repositories/OrderRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

    const detail = await OrderRepository.getDetail(id);
    return NextResponse.json({ success: true, data: detail });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener detalle', error: error.message }, { status: 500 });
  }
}
