import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/modules/inventario';

export const GET = withPublicRoute(async () => {
  const data = await ProductService.getShotsSummary();
  return NextResponse.json({ success: true, data });
});
