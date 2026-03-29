import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { OrderRepository } from '@/lib/repositories/OrderRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  console.log('[orders] Fetching all orders...');
  const orders = await OrderRepository.getAll();
  console.log('[orders] Found orders:', orders.length);
  return NextResponse.json({ success: true, data: orders });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const result = await OrderRepository.create(body);

  return NextResponse.json(
    { success: true, message: 'Pedido creado correctamente', ...result },
    { status: 201 }
  );
});
