import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/lib/services/ProductService';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const data = await ProductService.listMovimientosRecientes(
    searchParams.get('limit') ?? undefined
  );
  return NextResponse.json({ success: true, data });
});
