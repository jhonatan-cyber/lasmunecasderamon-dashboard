import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { OrderService } from '@/modules/operacion';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

  const detail = await OrderService.getDetail(id);
  return NextResponse.json({ success: true, data: detail });
});
