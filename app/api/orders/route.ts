import { NextResponse } from 'next/server';
import { OrderRepository } from '@/lib/repositories/OrderRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const orders = await OrderRepository.getAll();
    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener pedidos', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const result = await OrderRepository.create(body);

    return NextResponse.json({ success: true, message: 'Pedido creado correctamente', ...result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al crear pedido', error: error.message }, { status: 500 });
  }
}
