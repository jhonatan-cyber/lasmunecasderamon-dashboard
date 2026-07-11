import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { OrderService } from '@/lib/services/OrderService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 200), 500);
  const orders = await OrderService.getAll(limit);
  return NextResponse.json({ success: true, data: orders });
});

export const POST = withAppAuth(async (request: Request) => {
  const body = await request.json();
  const result = await OrderService.create(body);
  return NextResponse.json(
    { success: true, message: 'Pedido creado correctamente', ...result },
    { status: 201 }
  );
});
