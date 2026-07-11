import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { OrderService } from '@/lib/services/OrderService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

  const detail = await OrderService.getDetail(id);
  return NextResponse.json({ success: true, data: detail });
});
