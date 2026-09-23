import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/lib/services/ProductService';

// Catálogo para ventas: solo presentaciones con stock en el bar.
export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const data = await ProductService.listForSale({
    category_id: searchParams.get('category_id') || undefined,
    term: searchParams.get('term') || undefined
  });
  return NextResponse.json({ success: true, data });
});
